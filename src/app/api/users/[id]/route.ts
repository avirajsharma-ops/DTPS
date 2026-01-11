import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import connectDB from '@/lib/db/connection';
import User from '@/lib/db/models/User';
import Tag from '@/lib/db/models/Tag'; // Ensure Tag model is registered
import Task from '@/lib/db/models/Task'; // Ensure Task model is registered
import { UserRole } from '@/types';
import { withCache, clearCacheByTag } from '@/lib/api/utils';

// GET /api/users/[id] - Get specific user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const { id } = await params;

    // Validate ObjectId format
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return NextResponse.json(
        { error: 'Invalid user ID format' },
        { status: 400 }
      );
    }

    const user = await withCache(
      `users:id:${JSON.stringify(id)
      .select('-password')
      .populate('assignedDietitian', 'firstName lastName email avatar')
      .populate('tags', 'name description color icon')}`,
      async () => await User.findById(id)
      .select('-password')
      .populate('assignedDietitian', 'firstName lastName email avatar')
      .populate('tags', 'name description color icon').lean(),
      { ttl: 120000, tags: ['users'] }
    );

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user has access to view this profile

    const hasAccess =
      session.user.role === UserRole.ADMIN ||
      session.user.id === id ||
      ((session.user.role === UserRole.DIETITIAN || session.user.role === UserRole.HEALTH_COUNSELOR) &&
       user.role === UserRole.CLIENT) || // Allow dietitians/health counselors to view any client
      (session.user.role === UserRole.CLIENT &&
       (user.role === UserRole.DIETITIAN || user.role === UserRole.HEALTH_COUNSELOR)) || // Allow clients to view dietitians/health counselors
      ((session.user.role === UserRole.DIETITIAN || session.user.role === UserRole.HEALTH_COUNSELOR) &&
       (user.role === UserRole.DIETITIAN || user.role === UserRole.HEALTH_COUNSELOR)); // Allow dietitians/health counselors to view each other



    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ user });

  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

// PUT /api/users/[id] - Update specific user (admin only)
// export async function PUT(
//   request: NextRequest,
//   { params }: { params: Promise<{ id: string }> }
// ) {
//   try {
//     const session = await getServerSession(authOptions);
//     if (!session?.user) {
//       return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
//     }

//     const { id } = await params;
//     // Only admins can update other users, or users can update themselves
//     if (session.user.role !== UserRole.ADMIN && session.user.id !== id) {
//       return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
//     }

//     const body = await request.json();
//     await connectDB();

//     const user = await User.findById(id);
//     if (!user) {
//       return NextResponse.json(
//         { error: 'User not found' },
//         { status: 404 }
//       );
//     }

//     // Define allowed fields based on user permissions
//     let allowedFields = [
//       'firstName', 'lastName', 'phone', 'avatar', 'bio', 'status',
//       'dateOfBirth', 'gender', 'height', 'weight', 'activityLevel',
//       'healthGoals', 'medicalConditions', 'allergies', 'dietaryRestrictions',
//       'credentials', 'specializations', 'experience', 'consultationFee',
//       'availability', 'assignedDietitian'
//     ];

//     // Only admins can update roles
//     if (session.user.role === 'admin') {
//       allowedFields.push('role');
//     }

//     // Filter body to only include allowed fields
//     const updateData = Object.keys(body)
//       .filter(key => allowedFields.includes(key))
//       .reduce((obj: any, key) => {
//         obj[key] = body[key];
//         return obj;
//       }, {});

//     Object.assign(user, updateData);
//     await user.save();

//     // Return user without password
//     const updatedUser = user.toJSON();
//     delete updatedUser.password;

//     return NextResponse.json(updatedUser);

//   } catch (error) {
//     console.error('Error updating user:', error);
//     return NextResponse.json(
//       { error: 'Failed to update user' },
//       { status: 500 }
//     );
//   }
// }

// DELETE /api/users/[id] - Deactivate user (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== UserRole.ADMIN) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await connectDB();
    const { id } = await params;

    const user = await withCache(
      `users:id:${JSON.stringify(id)}`,
      async () => await User.findById(id).lean(),
      { ttl: 120000, tags: ['users'] }
    );
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Toggle user status between active and inactive
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    user.status = newStatus;
    await user.save();

    const action = newStatus === 'active' ? 'activated' : 'deactivated';
    return NextResponse.json({ message: `User ${action} successfully`, status: newStatus });

  } catch (error) {
    console.error('Error deactivating user:', error);
    return NextResponse.json(
      { error: 'Failed to deactivate user' },
      { status: 500 }
    );
  }
}

// PUT /api/users/[id] - Update specific user
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    await connectDB();

    // Fetch target user BEFORE permission check
    const targetUser = await withCache(
      `users:id:${JSON.stringify(id)}`,
      async () => await User.findById(id).lean(),
      { ttl: 120000, tags: ['users'] }
    );
    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Permission Logic:
    const isAdmin = session.user.role === UserRole.ADMIN;
    const isSelf = session.user.id === id;

    // Dietitian can update ONLY their assigned clients (including from assignedDietitians array)
    const isDietitianEditingClient =
      session.user.role === UserRole.DIETITIAN &&
      (targetUser.assignedDietitian?.toString() === session.user.id ||
       targetUser.assignedDietitians?.some((d: any) => d.toString() === session.user.id));

    // Health Counselor can update ONLY their assigned clients
    const isHealthCounselorEditingClient =
      session.user.role === UserRole.HEALTH_COUNSELOR &&
      targetUser.assignedHealthCounselor?.toString() === session.user.id;

    if (!isAdmin && !isSelf && !isDietitianEditingClient && !isHealthCounselorEditingClient) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Allowed fields to update (only User model fields)
    let allowedFields = [
      // Basic Info
      "firstName",
      "lastName",
      "phone",
      "email",
      "avatar",
      "bio",
      "status",
      "dateOfBirth",
      "gender",
      "parentAccount",
      "alternativePhone",
      "alternativeEmail",
      "anniversary",
      "source",
      "referralSource",
      "maritalStatus",
      "occupation",
      "targetWeightBucket",
      "sharePhotoConsent",
      "generalGoal",
      "healthGoals",
      // Lifestyle Data
      "height",
      "weight",
      "heightFeet",
      "heightInch",
      "heightCm",
      "weightKg",
      "targetWeightKg",
      "idealWeightKg",
      "bmi",
      "activityLevel",
      "activityRate",
      "foodPreference",
      "preferredCuisine",
      "allergiesFood",
      "fastDays",
      "nonVegExemptDays",
      "foodLikes",
      "foodDislikes",
      "eatOutFrequency",
      "smokingFrequency",
      "alcoholFrequency",
      "cookingOil",
      "monthlyOilConsumption",
      "cookingSalt",
      "carbonatedBeverageFrequency",
      "cravingType",
      // Medical Data
      "medicalConditions",
      "allergies",
      "dietaryRestrictions",
      "notes",
      "diseaseHistory",
      "medicalHistory",
      "familyHistory",
      "medication",
      "bloodGroup",
      "gutIssues",
      "reports",
      "isPregnant",
      // Professional fields (for dietitians)
      "credentials",
      "specializations",
      "experience",
      "consultationFee",
      "availability",
      "assignedDietitian",
      // Client engagement status
      "clientStatus",
      // Tags
      "tags"
    ];

    if (session.user.role === UserRole.ADMIN) {
      allowedFields.push("role");
    }

    // Check phone uniqueness if phone is being updated
    if (body.phone && body.phone !== targetUser.phone) {
      // Normalize phone number
      let normalizedPhone = String(body.phone).replace(/[\s\-\(\)]/g, '');
      if (!normalizedPhone.startsWith('+')) {
        normalizedPhone = '+91' + normalizedPhone;
      }
      
      // Check if phone is already used by another user
      const existingPhone = await withCache(
      `users:id:${JSON.stringify({ 
        phone: normalizedPhone,
        _id: { $ne: id }  // Exclude current user
      })}`,
      async () => await User.findOne({ 
        phone: normalizedPhone,
        _id: { $ne: id }  // Exclude current user
      }).lean(),
      { ttl: 120000, tags: ['users'] }
    );
      if (existingPhone) {
        return NextResponse.json({ error: 'This phone number is already registered' }, { status: 400 });
      }
      body.phone = normalizedPhone;
    }

    // FIX: Skip empty values (especially enums)
    const updateData = Object.keys(body)
      .filter((key) => allowedFields.includes(key))
      .reduce((obj: any, key) => {
        const value = body[key];
        if (value === "" || value === null) return obj; // <------ FIX
        // Special handling for generalGoal enum - only allow valid single values
        if (key === 'generalGoal' && value) {
          const validGoals = ['not-specified', 'weight-loss', 'weight-gain', 'disease-management'];
          if (!validGoals.includes(value)) {
            return obj; // Skip invalid values
          }
        }
        // Special handling for clientStatus enum
        if (key === 'clientStatus' && value) {
          const validStatuses = ['leading', 'active', 'inactive', 'onboarding', 'paused'];
          if (!validStatuses.includes(value)) {
            return obj; // Skip invalid values
          }
        }
        obj[key] = value;
        return obj;
      }, {});


    Object.assign(targetUser, updateData);
    await targetUser.save();

    const updatedUser = targetUser?.toJSON();
    delete updatedUser.password;

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}


// Post /api/users/[id] - Update the document for specific user
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { type, fileName, filePath } = body;

    if (!type || !fileName || !filePath) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await connectDB();
    const user = await withCache(
      `users:id:${JSON.stringify(id)}`,
      async () => await User.findById(id).lean(),
      { ttl: 120000, tags: ['users'] }
    );

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // ----------------------
    // PERMISSION CHECK
    // ----------------------
    const isAdmin = session.user.role === UserRole.ADMIN;
    const isSelf = session.user.id === id;
    const isDietitianAssigned =
      session.user.role === UserRole.DIETITIAN &&
      (user.assignedDietitian?.toString() === session.user.id ||
       user.assignedDietitians?.some((d: { toString: () => string }) => d.toString() === session.user.id));

    if (!isAdmin && !isSelf && !isDietitianAssigned) {
      return NextResponse.json({ error: "Forbidden: You cannot upload documents for this user" }, { status: 403 });
    }

    // ----------------------
    // ADD DOCUMENT
    // ----------------------
    user.documents.push({
      type,
      fileName,
      filePath,
      uploadedAt: new Date(),
    });

    await user.save();

    return NextResponse.json({ message: "Document uploaded successfully", documents: user.documents });
  } catch (error) {
    console.error("Error uploading document:", error);
    return NextResponse.json({ error: "Failed to upload document" }, { status: 500 });
  }
}