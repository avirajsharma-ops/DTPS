'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Clock, Bookmark, Search, Filter } from 'lucide-react';
import BottomNavBar from '@/components/client/BottomNavBar';

interface Blog {
  id: string;
  title: string;
  description: string;
  category: string;
  readTime: string;
  image: string;
  date: string;
  author: string;
}

const blogs: Blog[] = [
  {
    id: '1',
    title: 'Meal Prep 101: A Complete Guide',
    description: 'Master the art of preparing healthy meals for the entire week in under two hours.',
    category: 'NUTRITION',
    readTime: '5 min',
    image: 'from-amber-100 to-orange-100',
    date: 'Dec 15, 2025',
    author: 'Dr. Sarah Johnson',
  },
  {
    id: '2',
    title: '5 Moves for Core Strength',
    description: 'Strengthen your core with these simple yet effective exercises you can do anywhere.',
    category: 'FITNESS',
    readTime: '4 min',
    image: 'from-green-100 to-emerald-100',
    date: 'Dec 14, 2025',
    author: 'Mike Chen',
  },
  {
    id: '3',
    title: 'Mindful Eating Habits',
    description: 'Learn how to develop a healthier relationship with food through mindfulness.',
    category: 'WELLNESS',
    readTime: '6 min',
    image: 'from-purple-100 to-pink-100',
    date: 'Dec 13, 2025',
    author: 'Dr. Emily White',
  },
  {
    id: '4',
    title: 'Understanding Macros',
    description: 'A beginner\'s guide to understanding macronutrients and how they fuel your body.',
    category: 'NUTRITION',
    readTime: '8 min',
    image: 'from-blue-100 to-cyan-100',
    date: 'Dec 12, 2025',
    author: 'Nutritionist Team',
  },
  {
    id: '5',
    title: 'Sleep & Recovery',
    description: 'Why quality sleep is essential for fitness gains and overall health.',
    category: 'WELLNESS',
    readTime: '5 min',
    image: 'from-indigo-100 to-violet-100',
    date: 'Dec 11, 2025',
    author: 'Dr. James Lee',
  },
  {
    id: '6',
    title: 'HIIT vs Steady State Cardio',
    description: 'Which type of cardio is better for your fitness goals? We break it down.',
    category: 'FITNESS',
    readTime: '7 min',
    image: 'from-rose-100 to-pink-100',
    date: 'Dec 10, 2025',
    author: 'Coach Taylor',
  },
];

const categories = ['All', 'Nutrition', 'Fitness', 'Wellness'];

export default function BlogsPage() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredBlogs = blogs.filter((blog) => {
    const matchesCategory = selectedCategory === 'All' || blog.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesSearch = blog.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         blog.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white px-5 pt-8 pb-4 sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <Link href="/user" className="text-gray-600">
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Blogs</h1>
        </div>

        {/* Search */}
        <div className="mt-4 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search blogs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-12 pl-12 pr-4 bg-gray-100 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 mt-4 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCategory === category
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Blog List */}
      <div className="px-5 py-4 space-y-4">
        {filteredBlogs.map((blog) => (
          <Link
            key={blog.id}
            href={`/user/blogs/${blog.id}`}
            className="block bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow"
          >
            <div className={`h-40 bg-gradient-to-br ${blog.image} relative`}>
              <span className="absolute top-3 left-3 bg-white/90 text-xs font-semibold px-2 py-1 rounded-full text-gray-700">
                {blog.category}
              </span>
              <button 
                className="absolute top-3 right-3 h-8 w-8 bg-white/90 rounded-full flex items-center justify-center"
                onClick={(e) => {
                  e.preventDefault();
                  // Handle bookmark
                }}
              >
                <Bookmark className="h-4 w-4 text-gray-600" />
              </button>
              <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
                <Clock className="h-3 w-3" />
                {blog.readTime}
              </div>
            </div>
            <div className="p-4">
              <h3 className="font-bold text-gray-900 text-lg">{blog.title}</h3>
              <p className="text-gray-500 text-sm mt-1 line-clamp-2">{blog.description}</p>
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-gray-400">{blog.author}</span>
                <span className="text-xs text-gray-400">{blog.date}</span>
              </div>
            </div>
          </Link>
        ))}

        {filteredBlogs.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No blogs found</p>
          </div>
        )}
      </div>

      <BottomNavBar />
    </div>
  );
}
