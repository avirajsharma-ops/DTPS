import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connection';
import User from '@/lib/db/models/User';
import { UserRole } from '@/types';
import { adminSSEManager } from '@/lib/realtime/admin-sse-manager';
import { withCache, clearCacheByTag } from '@/lib/api/utils';

// GET /api/users - Get users (for dietitians to see clients, admins to see all)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50');
    const page = parseInt(searchParams.get('page') || '1');
    const viewAll = searchParams.get('viewAll') === 'true';

    let query: any = {};

    // Role-based access control
    if (session.user.role === UserRole.DIETITIAN) {
      // Dietitians can see only their assigned clients (including from array)
      query = {
        role: UserRole.CLIENT,
        $or: [
          { assignedDietitian: session.user.id },
          { assignedDietitians: session.user.id }
        ]
      };
    } else if (session.user.role === UserRole.HEALTH_COUNSELOR) {
      // Health Counselors can see all clients when role=client is passed
      if (role === 'client') {
        query = { role: UserRole.CLIENT };
      } else {
        // Default: show only assigned clients
        query = {
          role: UserRole.CLIENT,
          $or: [
            { assignedDietitian: session.user.id },
            { assignedDietitians: session.user.id }
          ]
        };
      }
    } else if (session.user.role === UserRole.CLIENT) {
      // Clients can see only their assigned dietitian
      const currentUser = await User.findById(session.user.id).select('assignedDietitian').lean();

      if (currentUser?.assignedDietitian) {
        // Show only assigned dietitian
        query = {
          _id: currentUser.assignedDietitian
        };
      } else {
        // If no assigned dietitian, show all dietitians and health counselors
        query = {
          role: { $in: [UserRole.DIETITIAN, UserRole.HEALTH_COUNSELOR] }
        };
      }
    } else if (session.user.role === UserRole.ADMIN) {
      // Admins can see all users
      if (role) {
        query.role = role;
      }
    } else {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Search functionality
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // For admin users, include password field; for others, exclude it
    const selectFields = session.user.role === UserRole.ADMIN ? '' : '-password';

    // Generate cache key based on role and query params
    const cacheKey = `users:${session.user.role}:${role || 'all'}:${search || ''}:${page}:${limit}`;
    
    const { users, total, adminsCount, dietitiansCount, healthCounselorsCount, clientsCount } = await withCache(
      cacheKey,
      async () => {
        const users = await User.find(query)
          .select(selectFields)
          .sort({ createdAt: -1 })
          .limit(limit)
          .skip((page - 1) * limit)
          .lean();

        const total = await User.countDocuments(query);

        const [adminsCount, dietitiansCount, healthCounselorsCount, clientsCount] = await Promise.all([
          User.countDocuments({ role: UserRole.ADMIN }),
          User.countDocuments({ role: UserRole.DIETITIAN }),
          User.countDocuments({ role: UserRole.HEALTH_COUNSELOR }),
          User.countDocuments({ role: UserRole.CLIENT })
        ]);

        return { users, total, adminsCount, dietitiansCount, healthCounselorsCount, clientsCount };
      },
      { ttl: 120000, tags: ['users'] } // 2 minutes TTL
    );

    // For admin users, we need to manually serialize to include passwords
    let serializedUsers;
    if (session.user.role === UserRole.ADMIN) {
      serializedUsers = users.map((user: any) => {
        return {
          ...user,
          password: user.password // Explicitly include password for admin
        };
      });
    } else {
      serializedUsers = users;
    }

    return NextResponse.json({
      users: serializedUsers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      roleCounts: {
        admin: adminsCount,
        dietitian: dietitiansCount,
        healthCounselor: healthCounselorsCount,
        client: clientsCount
      }
    });

  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// POST /api/users - Create new user (admin, dietitian, or health counselor can create clients)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Allow admin, dietitian, and health counselor to create users
    const allowedRoles = [UserRole.ADMIN, UserRole.DIETITIAN, UserRole.HEALTH_COUNSELOR];
    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { email, password, firstName, lastName, role, phone, bio, experience, consultationFee, specializations, credentials, gender, dateOfBirth, assignedDietitian, assignedHealthCounselor } = body || {};

    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!phone) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    await connectDB();

    const existing = await User.findOne({ email: String(email).toLowerCase() });
    if (existing) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
    }

    // Normalize phone number - remove spaces and dashes
    let normalizedPhone = String(phone).replace(/[\s\-\(\)]/g, '');
    // Ensure it starts with + (country code)
    if (!normalizedPhone.startsWith('+')) {
      normalizedPhone = '+91' + normalizedPhone;
    }

    // Check if phone number is already registered
    const existingPhone = await User.findOne({ phone: normalizedPhone });
    if (existingPhone) {
      return NextResponse.json({ error: 'This phone number is already registered' }, { status: 400 });
    }

    // Determine assignment based on who is creating the client
    let finalAssignedDietitian = assignedDietitian;
    let finalAssignedHealthCounselor = assignedHealthCounselor;
    
    // If health counselor is creating a client, auto-assign to themselves
    if (session.user.role === UserRole.HEALTH_COUNSELOR) {
      finalAssignedHealthCounselor = session.user.id;
    }
    // If dietitian is creating a client, auto-assign to themselves
    else if (session.user.role === UserRole.DIETITIAN) {
      finalAssignedDietitian = finalAssignedDietitian || session.user.id;
    }

    // Determine createdBy info based on who is creating the user
    let createdByInfo: { userId?: string; role: string } = { role: '' };
    if (session.user.role === UserRole.ADMIN) {
      createdByInfo = { userId: session.user.id, role: 'admin' };
    } else if (session.user.role === UserRole.DIETITIAN) {
      createdByInfo = { userId: session.user.id, role: 'dietitian' };
    } else if (session.user.role === UserRole.HEALTH_COUNSELOR) {
      createdByInfo = { userId: session.user.id, role: 'health_counselor' };
    }
    
    const user = new User({
      email: String(email).toLowerCase(),
      password, // NOTE: comparePassword supports plain text in this codebase; replace with hashing in production
      firstName,
      lastName,
      role: role || UserRole.CLIENT,
      phone: normalizedPhone,
      bio,
      experience,
      consultationFee,
      specializations,
      credentials,
      gender,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      assignedDietitian: finalAssignedDietitian,
      assignedHealthCounselor: finalAssignedHealthCounselor,
      createdBy: createdByInfo,
      status: 'active'
    });

    await user.save();

    // If a client was created, broadcast SSE update to admin connections
    if ((role || UserRole.CLIENT) === UserRole.CLIENT) {
      // Populate references for the broadcast
      await user.populate('assignedDietitian', 'firstName lastName email avatar');
      await user.populate('assignedDietitians', 'firstName lastName email avatar');
      await user.populate('assignedHealthCounselor', 'firstName lastName email avatar');
      await user.populate({
        path: 'createdBy.userId',
        select: 'firstName lastName role',
        strictPopulate: false
      });

      // Recalculate stats
      const total = await User.countDocuments({ role: UserRole.CLIENT });
      const assignedCount = await User.countDocuments({ 
        role: UserRole.CLIENT, 
        $or: [
          { assignedDietitian: { $ne: null } },
          { assignedDietitians: { $exists: true, $not: { $size: 0 } } }
        ]
      });
      const unassignedCount = await User.countDocuments({ 
        role: UserRole.CLIENT, 
        assignedDietitian: null,
        $or: [
          { assignedDietitians: { $exists: false } },
          { assignedDietitians: { $size: 0 } }
        ]
      });

      adminSSEManager.broadcastClientUpdate('client_added', {
        client: user.toObject(),
        stats: {
          total,
          assigned: assignedCount,
          unassigned: unassignedCount
        },
        timestamp: Date.now()
      });
    }

    // Clear users cache after creation
    clearCacheByTag('users');

    const created = user.toJSON();
    delete (created as any).password;

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}


// PUT /api/users - Update user profile
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    await connectDB();

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Update allowed fields based on role
    const allowedFields = [
      'firstName', 'lastName', 'phone', 'avatar', 'bio',
      'dateOfBirth', 'gender', 'height', 'weight', 'activityLevel',
      'healthGoals', 'medicalConditions', 'allergies', 'dietaryRestrictions'
    ];

    // Dietitians can also update professional fields
    if (session.user.role === UserRole.DIETITIAN) {
      allowedFields.push(
        'credentials', 'specializations', 'experience',
        'consultationFee', 'availability'
      );
    }

    // Filter body to only include allowed fields
    const updateData = Object.keys(body)
      .filter(key => allowedFields.includes(key))
      .reduce((obj: any, key) => {
        obj[key] = body[key];
        return obj;
      }, {});

    Object.assign(user, updateData);
    await user.save();

    // Clear users cache after update
    clearCacheByTag('users');

    // Return user without password
    const updatedUser = user.toJSON();
    delete updatedUser.password;

    return NextResponse.json(updatedUser);

  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}
