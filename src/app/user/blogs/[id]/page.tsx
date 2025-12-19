'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Clock, Bookmark, Share2, Heart } from 'lucide-react';
import BottomNavBar from '@/components/client/BottomNavBar';

const blogContent: Record<string, {
  title: string;
  category: string;
  readTime: string;
  image: string;
  date: string;
  author: string;
  content: string[];
}> = {
  '1': {
    title: 'Meal Prep 101: A Complete Guide',
    category: 'NUTRITION',
    readTime: '5 min',
    image: 'from-amber-100 to-orange-100',
    date: 'Dec 15, 2025',
    author: 'Dr. Sarah Johnson',
    content: [
      'Meal prepping is one of the most effective ways to maintain a healthy diet while saving time and money. By dedicating a few hours each week to preparing your meals in advance, you can ensure you always have nutritious options available.',
      'Getting Started with Meal Prep',
      'Start by planning your meals for the week. Consider your schedule, dietary goals, and preferences. Make a shopping list and stick to it to avoid impulse purchases.',
      'Essential Tools You\'ll Need',
      'Invest in quality food storage containers, a good set of knives, cutting boards, and basic cooking equipment. Having the right tools makes the process much smoother.',
      'Time-Saving Tips',
      'Cook proteins in bulk, prepare grains and vegetables that can be mixed and matched, and use your oven to cook multiple items at once. Label everything with dates to track freshness.',
      'Storage Guidelines',
      'Most prepared meals can be refrigerated for 3-4 days or frozen for up to 3 months. Always cool food completely before storing and use airtight containers.',
    ],
  },
  '2': {
    title: '5 Moves for Core Strength',
    category: 'FITNESS',
    readTime: '4 min',
    image: 'from-green-100 to-emerald-100',
    date: 'Dec 14, 2025',
    author: 'Mike Chen',
    content: [
      'A strong core is the foundation of overall fitness. It improves posture, reduces back pain, and enhances athletic performance. Here are five essential moves to strengthen your core.',
      '1. Plank Hold',
      'Start in a push-up position with your forearms on the ground. Keep your body in a straight line from head to heels. Hold for 30-60 seconds.',
      '2. Dead Bug',
      'Lie on your back with arms extended toward the ceiling and knees bent at 90 degrees. Slowly lower opposite arm and leg while keeping your back pressed to the floor.',
      '3. Bird Dog',
      'Start on all fours. Extend your right arm and left leg simultaneously, keeping your spine neutral. Alternate sides for 10-12 reps each.',
      '4. Bicycle Crunches',
      'Lie on your back with hands behind your head. Bring opposite elbow to knee while extending the other leg. Perform controlled movements for 15-20 reps.',
      '5. Russian Twists',
      'Sit with knees bent and feet off the ground. Rotate your torso side to side, optionally holding a weight for added resistance.',
    ],
  },
  '3': {
    title: 'Mindful Eating Habits',
    category: 'WELLNESS',
    readTime: '6 min',
    image: 'from-purple-100 to-pink-100',
    date: 'Dec 13, 2025',
    author: 'Dr. Emily White',
    content: [
      'Mindful eating is the practice of paying full attention to the experience of eating. It helps develop a healthier relationship with food and can lead to better digestion and satisfaction.',
      'What is Mindful Eating?',
      'Mindful eating involves being fully present during meals, paying attention to the colors, smells, textures, and tastes of your food. It means eating without distractions and listening to your body\'s hunger cues.',
      'Benefits of Mindful Eating',
      'Studies show that mindful eating can help reduce overeating, improve digestion, and increase meal satisfaction. It can also help identify emotional eating patterns.',
      'How to Practice',
      'Start by eating one meal a day without any distractions. Put away your phone, turn off the TV, and focus solely on your food. Chew slowly and savor each bite.',
      'Listening to Your Body',
      'Learn to distinguish between physical hunger and emotional hunger. Eat when you\'re hungry and stop when you\'re comfortably full, not stuffed.',
    ],
  },
};

export default function BlogDetailPage() {
  const params = useParams();
  const blogId = params.id as string;
  const blog = blogContent[blogId];

  if (!blog) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Blog not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header Image */}
      <div className={`h-64 bg-gradient-to-br ${blog.image} relative`}>
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 pt-8">
          <Link href="/user/blogs" className="h-10 w-10 bg-white/90 rounded-full flex items-center justify-center">
            <ArrowLeft className="h-5 w-5 text-gray-700" />
          </Link>
          <div className="flex gap-2">
            <button className="h-10 w-10 bg-white/90 rounded-full flex items-center justify-center">
              <Share2 className="h-5 w-5 text-gray-700" />
            </button>
            <button className="h-10 w-10 bg-white/90 rounded-full flex items-center justify-center">
              <Bookmark className="h-5 w-5 text-gray-700" />
            </button>
          </div>
        </div>
        <span className="absolute bottom-4 left-4 bg-white/90 text-xs font-semibold px-3 py-1.5 rounded-full text-gray-700">
          {blog.category}
        </span>
      </div>

      {/* Content */}
      <div className="bg-white -mt-6 rounded-t-3xl relative">
        <div className="px-5 pt-6 pb-4">
          <h1 className="text-2xl font-bold text-gray-900">{blog.title}</h1>
          
          <div className="flex items-center gap-4 mt-4 text-sm text-gray-500">
            <span>{blog.author}</span>
            <span>•</span>
            <span>{blog.date}</span>
            <span>•</span>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {blog.readTime}
            </div>
          </div>

          {/* Article Content */}
          <div className="mt-6 space-y-4">
            {blog.content.map((paragraph, index) => {
              // Check if it's a heading (short text without period)
              const isHeading = paragraph.length < 50 && !paragraph.endsWith('.');
              
              return isHeading ? (
                <h2 key={index} className="text-lg font-bold text-gray-900 mt-6">
                  {paragraph}
                </h2>
              ) : (
                <p key={index} className="text-gray-600 leading-relaxed">
                  {paragraph}
                </p>
              );
            })}
          </div>

          {/* Engagement */}
          <div className="flex items-center gap-4 mt-8 pt-6 border-t border-gray-100">
            <button className="flex items-center gap-2 text-gray-500 hover:text-red-500 transition-colors">
              <Heart className="h-6 w-6" />
              <span className="text-sm">124 likes</span>
            </button>
            <button className="flex items-center gap-2 text-gray-500 hover:text-green-500 transition-colors">
              <Share2 className="h-6 w-6" />
              <span className="text-sm">Share</span>
            </button>
          </div>
        </div>
      </div>

      <BottomNavBar />
    </div>
  );
}
