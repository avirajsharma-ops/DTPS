import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connection';
import User from '@/lib/db/models/User';
import { UserRole } from '@/types';

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

    let query: any = {};

    // Role-based access control
    if (session.user.role === UserRole.DIETITIAN || session.user.role === UserRole.HEALTH_COUNSELOR) {
      // Dietitians and Health Counselors can see only their assigned clients (including from array)
      query = {
        role: UserRole.CLIENT,
        $or: [
          { assignedDietitian: session.user.id },
          { assignedDietitians: session.user.id }
        ]
      };
    } else if (session.user.role === UserRole.CLIENT) {
      // Clients can see only their assigned dietitian
      const currentUser = await User.findById(session.user.id).select('assignedDietitian');

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

    const users = await User.find(query)
      .select(selectFields)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    const [adminsCount, dietitiansCount, healthCounselorsCount, clientsCount] = await Promise.all([
      User.countDocuments({ role: UserRole.ADMIN }),
      User.countDocuments({ role: UserRole.DIETITIAN }),
      User.countDocuments({ role: UserRole.HEALTH_COUNSELOR }),
      User.countDocuments({ role: UserRole.CLIENT })
    ]);

    // For admin users, we need to manually serialize to include passwords
    let serializedUsers;
    if (session.user.role === UserRole.ADMIN) {
      serializedUsers = users.map(user => {
        const userObj = user.toObject();
        return {
          ...userObj,
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

// POST /api/users - Create new user (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { email, password, firstName, lastName, role, phone, bio, experience, consultationFee, specializations, credentials, gender, dateOfBirth, assignedDietitian } = body || {};

    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await connectDB();

    const existing = await User.findOne({ email: String(email).toLowerCase() });
    if (existing) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
    }

    const user = new User({
      email: String(email).toLowerCase(),
      password, // NOTE: comparePassword supports plain text in this codebase; replace with hashing in production
      firstName,
      lastName,
      role: role || UserRole.CLIENT,
      phone,
      bio,
      experience,
      consultationFee,
      specializations,
      credentials,
      gender,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      assignedDietitian,
      status: 'active'
    });

    await user.save();

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
