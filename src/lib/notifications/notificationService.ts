import { sendNotificationToUser, sendNotificationToUsers } from '@/lib/firebase';
import connectDB from '@/lib/db/connection';
import User from '@/lib/db/models/User';

// Notification types
export type NotificationType = 
  | 'new_message'
  | 'appointment_booked'
  | 'appointment_cancelled'
  | 'appointment_reminder'
  | 'task_assigned'
  | 'meal_plan_created'
  | 'meal_plan_updated'
  | 'custom';

interface NotificationOptions {
  type: NotificationType;
  userId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  clickAction?: string;
}

/**
 * Send a notification for a new message
 */
export async function sendNewMessageNotification(
  recipientId: string,
  senderName: string,
  messagePreview: string,
  conversationId?: string
) {
  return sendNotificationToUser(recipientId, {
    title: `New message from ${senderName}`,
    body: messagePreview.substring(0, 100) + (messagePreview.length > 100 ? '...' : ''),
    icon: '/icons/icon-192x192.png',
    data: {
      type: 'new_message',
      conversationId: conversationId || '',
      senderId: senderName,
    },
    clickAction: conversationId ? `/messages?conversation=${conversationId}` : '/messages',
  });
}

/**
 * Send a notification for appointment booking
 */
export async function sendAppointmentBookedNotification(
  userId: string,
  appointmentDetails: {
    date: string;
    time: string;
    type: string;
    withName?: string;
  }
) {
  const body = appointmentDetails.withName
    ? `Your ${appointmentDetails.type} appointment with ${appointmentDetails.withName} is scheduled for ${appointmentDetails.date} at ${appointmentDetails.time}`
    : `Your ${appointmentDetails.type} appointment is scheduled for ${appointmentDetails.date} at ${appointmentDetails.time}`;

  return sendNotificationToUser(userId, {
    title: 'Appointment Booked',
    body,
    icon: '/icons/icon-192x192.png',
    data: {
      type: 'appointment_booked',
      date: appointmentDetails.date,
      time: appointmentDetails.time,
    },
    clickAction: '/user/appointments',
  });
}

/**
 * Send a notification for appointment cancellation
 */
export async function sendAppointmentCancelledNotification(
  userId: string,
  appointmentDetails: {
    date: string;
    time: string;
    type: string;
    reason?: string;
  }
) {
  return sendNotificationToUser(userId, {
    title: 'Appointment Cancelled',
    body: `Your ${appointmentDetails.type} appointment on ${appointmentDetails.date} at ${appointmentDetails.time} has been cancelled.${appointmentDetails.reason ? ` Reason: ${appointmentDetails.reason}` : ''}`,
    icon: '/icons/icon-192x192.png',
    data: {
      type: 'appointment_cancelled',
      date: appointmentDetails.date,
      time: appointmentDetails.time,
    },
    clickAction: '/user/appointments',
  });
}

/**
 * Send a notification for task assignment (water, steps, sleep, activity)
 */
export async function sendTaskAssignedNotification(
  userId: string,
  taskDetails: {
    taskType: 'water' | 'steps' | 'sleep' | 'activity';
    target: string;
    date: string;
  }
) {
  const taskNames: Record<string, string> = {
    water: 'Water Intake',
    steps: 'Steps',
    sleep: 'Sleep',
    activity: 'Activity',
  };

  return sendNotificationToUser(userId, {
    title: `New ${taskNames[taskDetails.taskType]} Goal Assigned`,
    body: `Your ${taskNames[taskDetails.taskType].toLowerCase()} goal for ${taskDetails.date}: ${taskDetails.target}`,
    icon: '/icons/icon-192x192.png',
    data: {
      type: 'task_assigned',
      taskType: taskDetails.taskType,
      target: taskDetails.target,
      date: taskDetails.date,
    },
    clickAction: '/user/tasks',
  });
}

/**
 * Send a notification for meal plan creation
 */
export async function sendMealPlanCreatedNotification(
  userId: string,
  mealPlanDetails: {
    planName: string;
    startDate: string;
    endDate: string;
    dietitianName?: string;
  }
) {
  const body = mealPlanDetails.dietitianName
    ? `${mealPlanDetails.dietitianName} has created a new meal plan "${mealPlanDetails.planName}" for you (${mealPlanDetails.startDate} - ${mealPlanDetails.endDate})`
    : `A new meal plan "${mealPlanDetails.planName}" has been created for you (${mealPlanDetails.startDate} - ${mealPlanDetails.endDate})`;

  return sendNotificationToUser(userId, {
    title: 'New Meal Plan Created',
    body,
    icon: '/icons/icon-192x192.png',
    data: {
      type: 'meal_plan_created',
      planName: mealPlanDetails.planName,
      startDate: mealPlanDetails.startDate,
      endDate: mealPlanDetails.endDate,
    },
    clickAction: '/user/plan',
  });
}

/**
 * Send a notification for meal plan update
 */
export async function sendMealPlanUpdatedNotification(
  userId: string,
  mealPlanDetails: {
    planName: string;
    updatedBy?: string;
  }
) {
  return sendNotificationToUser(userId, {
    title: 'Meal Plan Updated',
    body: mealPlanDetails.updatedBy
      ? `${mealPlanDetails.updatedBy} has updated your meal plan "${mealPlanDetails.planName}"`
      : `Your meal plan "${mealPlanDetails.planName}" has been updated`,
    icon: '/icons/icon-192x192.png',
    data: {
      type: 'meal_plan_updated',
      planName: mealPlanDetails.planName,
    },
    clickAction: '/user/plan',
  });
}

/**
 * Send a custom notification from dietitian panel
 */
export async function sendCustomNotification(
  userId: string,
  notification: {
    title: string;
    body: string;
    clickAction?: string;
  }
) {
  return sendNotificationToUser(userId, {
    title: notification.title,
    body: notification.body,
    icon: '/icons/icon-192x192.png',
    data: {
      type: 'custom',
    },
    clickAction: notification.clickAction || '/user',
  });
}

/**
 * Send notification to all clients of a dietitian
 */
export async function sendNotificationToAllClients(
  dietitianId: string,
  notification: {
    title: string;
    body: string;
    clickAction?: string;
  }
) {
  try {
    await connectDB();
    const clients = await User.find({
      $or: [
        { assignedDietitian: dietitianId },
        { assignedHealthCounselor: dietitianId },
      ],
      status: 'active',
    }).select('_id');

    const clientIds = clients.map(c => c._id.toString());
    
    if (clientIds.length === 0) {
      return { successCount: 0, failureCount: 0, invalidTokens: [], responses: [] };
    }

    return sendNotificationToUsers(clientIds, {
      title: notification.title,
      body: notification.body,
      icon: '/icons/icon-192x192.png',
      data: {
        type: 'custom',
      },
      clickAction: notification.clickAction || '/user',
    });
  } catch (error) {
    console.error('Error sending notification to all clients:', error);
    return { successCount: 0, failureCount: 1, invalidTokens: [], responses: [] };
  }
}
