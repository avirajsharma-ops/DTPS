'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Clock, Bookmark, Search, BookOpen, TrendingUp, Heart, ChevronRight, Sparkles, User } from 'lucide-react';
import UserNavBar from '@/components/client/UserNavBar';
import SpoonGifLoader from '@/components/ui/SpoonGifLoader';

interface Blog {
  id: string;
  title: string;
  description: string;
  category: string;
  readTime: string;
  image: string;
  date: string;
  author: string;
  featured?: boolean;
}

const blogs: Blog[] = [
  {
    id: '1',
    title: 'Meal Prep 101: A Complete Guide',
    description: 'Master the art of preparing healthy meals for the entire week in under two hours.',
    category: 'NUTRITION',
    readTime: '5 min',
    image: 'from-[#3AB1A0]/20 to-[#2D8A7C]/20',
    date: 'Dec 15, 2025',
    author: 'Dr. Sarah Johnson',
    featured: true,
  },
  {
    id: '2',
    title: '5 Moves for Core Strength',
    description: 'Strengthen your core with these simple yet effective exercises you can do anywhere.',
    category: 'FITNESS',
    readTime: '4 min',
    image: 'from-[#E06A26]/20 to-[#DB9C6E]/20',
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
    image: 'from-[#3AB1A0]/20 to-[#2D8A7C]/20',
    date: 'Dec 12, 2025',
    author: 'Nutritionist Team',
    featured: true,
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
    image: 'from-[#E06A26]/20 to-[#DB9C6E]/20',
    date: 'Dec 10, 2025',
    author: 'Coach Taylor',
  },
];

const categories = ['All', 'Nutrition', 'Fitness', 'Wellness'];

const getCategoryColor = (category: string) => {
  switch (category.toUpperCase()) {
    case 'NUTRITION':
      return 'bg-[#3AB1A0]/10 text-[#3AB1A0] border-[#3AB1A0]/20';
    case 'FITNESS':
      return 'bg-[#E06A26]/10 text-[#E06A26] border-[#E06A26]/20';
    case 'WELLNESS':
      return 'bg-purple-100 text-purple-700 border-purple-200';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
  }
};

const getCategoryIcon = (category: string) => {
  switch (category.toUpperCase()) {
    case 'NUTRITION':
      return '🥗';
    case 'FITNESS':
      return '💪';
    case 'WELLNESS':
      return '🧘';
    default:
      return '📖';
  }
};

export default function BlogsPage() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [bookmarkedBlogs, setBookmarkedBlogs] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const toggleBookmark = (e: React.MouseEvent, blogId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setBookmarkedBlogs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(blogId)) {
        newSet.delete(blogId);
      } else {
        newSet.add(blogId);
      }
      return newSet;
    });
  };

  const filteredBlogs = blogs.filter((blog) => {
    const matchesCategory = selectedCategory === 'All' || blog.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesSearch = blog.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         blog.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const featuredBlogs = filteredBlogs.filter(blog => blog.featured);
  const regularBlogs = filteredBlogs.filter(blog => !blog.featured);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
        <SpoonGifLoader size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="px-4 py-4">
          <div className="flex items-center gap-3">
            <Link 
              href="/user" 
              className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-[#3AB1A0]/10 transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-[#3AB1A0]" />
            </Link>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-900">Health Blogs</h1>
              <p className="text-xs text-gray-500">Tips & insights for your wellness journey</p>
            </div>
            <div className="p-2 bg-linear-to-br from-[#3AB1A0] to-[#2D8A7C] rounded-xl shadow-md">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
          </div>

          {/* Search */}
          <div className="mt-4 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-12 pl-12 pr-4 bg-gray-100 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3AB1A0] transition-all"
            />
          </div>

          {/* Category Filter */}
          <div className="flex gap-2 mt-4 overflow-x-auto pb-2 scrollbar-hide">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  selectedCategory === category
                    ? 'bg-linear-to-r from-[#3AB1A0] to-[#2D8A7C] text-white shadow-md'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {category !== 'All' && <span className="mr-1">{getCategoryIcon(category)}</span>}
                {category}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Featured Blogs - Horizontal Scroll */}
      {featuredBlogs.length > 0 && (
        <div className="px-4 pt-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 bg-[#E06A26]/10 rounded-lg">
              <Sparkles className="h-4 w-4 text-[#E06A26]" />
            </div>
            <h2 className="text-base font-bold text-gray-900">Featured</h2>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4">
            {featuredBlogs.map((blog) => (
              <Link
                key={blog.id}
                href={`/user/blogs/${blog.id}`}
                className="block w-72 shrink-0 bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-lg transition-all hover:-translate-y-1"
              >
                <div className={`h-32 bg-linear-to-br ${blog.image} relative p-4 flex flex-col justify-end`}>
                  <span className={`absolute top-3 left-3 text-xs font-bold px-2.5 py-1 rounded-full border ${getCategoryColor(blog.category)}`}>
                    {getCategoryIcon(blog.category)} {blog.category}
                  </span>
                  <button 
                    className={`absolute top-3 right-3 h-8 w-8 rounded-full flex items-center justify-center transition-all ${
                      bookmarkedBlogs.has(blog.id) 
                        ? 'bg-[#E06A26] text-white' 
                        : 'bg-white/90 text-gray-600 hover:bg-white'
                    }`}
                    onClick={(e) => toggleBookmark(e, blog.id)}
                  >
                    <Bookmark className={`h-4 w-4 ${bookmarkedBlogs.has(blog.id) ? 'fill-current' : ''}`} />
                  </button>
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-gray-900 text-base line-clamp-2">{blog.title}</h3>
                  <p className="text-gray-500 text-sm mt-1 line-clamp-2">{blog.description}</p>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#3AB1A0]/10 flex items-center justify-center">
                        <User className="h-3 w-3 text-[#3AB1A0]" />
                      </div>
                      <span className="text-xs text-gray-500">{blog.author}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <Clock className="h-3 w-3" />
                      {blog.readTime}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* All Articles */}
      <div className="px-4 pt-2 pb-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-1.5 bg-[#3AB1A0]/10 rounded-lg">
            <TrendingUp className="h-4 w-4 text-[#3AB1A0]" />
          </div>
          <h2 className="text-base font-bold text-gray-900">Latest Articles</h2>
        </div>
        <div className="space-y-3">
          {regularBlogs.map((blog) => (
            <Link
              key={blog.id}
              href={`/user/blogs/${blog.id}`}
              className="flex gap-4 bg-white rounded-2xl p-3 shadow-sm hover:shadow-md transition-all group"
            >
              <div className={`w-24 h-24 shrink-0 bg-linear-to-br ${blog.image} rounded-xl flex items-center justify-center text-3xl`}>
                {getCategoryIcon(blog.category)}
              </div>
              <div className="flex-1 min-w-0 py-1">
                <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${getCategoryColor(blog.category)} mb-1`}>
                  {blog.category}
                </span>
                <h3 className="font-bold text-gray-900 text-sm line-clamp-2 group-hover:text-[#3AB1A0] transition-colors">{blog.title}</h3>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs text-gray-400">{blog.date}</span>
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Clock className="h-3 w-3" />
                    {blog.readTime}
                  </div>
                </div>
              </div>
              <button 
                className={`self-start p-2 rounded-full transition-all ${
                  bookmarkedBlogs.has(blog.id) 
                    ? 'text-[#E06A26]' 
                    : 'text-gray-300 hover:text-gray-500'
                }`}
                onClick={(e) => toggleBookmark(e, blog.id)}
              >
                <Bookmark className={`h-4 w-4 ${bookmarkedBlogs.has(blog.id) ? 'fill-current' : ''}`} />
              </button>
            </Link>
          ))}
        </div>

        {filteredBlogs.length === 0 && (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <BookOpen className="h-10 w-10 text-gray-300" />
            </div>
            <p className="text-gray-500 font-medium">No articles found</p>
            <p className="text-gray-400 text-sm mt-1">Try adjusting your search or filters</p>
          </div>
        )}
      </div>

      <UserNavBar />
    </div>
  );
}
