"use client";

import { useState } from "react";
import {
  X,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Plus,
} from "lucide-react";
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type FoodItem = {
  id: string;
  date: string;
  time: string;
  menu: string;
  amount: string;
  cals: number;
  carbs: number;
  protein: number;
  fats: number;
  selected: boolean;
};

type FoodDatabasePanelProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelectFood: (foods: FoodItem[]) => void;
};

const initialFoodData: FoodItem[] = [
  {
    id: "1",
    date: "2028-09-01",
    time: "07:30",
    menu: "Scrambled Eggs with Spinach & Whole Grain Toast",
    amount: "2 Slices",
    cals: 300,
    carbs: 25,
    protein: 20,
    fats: 12,
    selected: false,
  },
  {
    id: "2",
    date: "2028-09-01",
    time: "12:30",
    menu: "Grilled Chicken Wrap with Avocado",
    amount: "1 Wrap",
    cals: 450,
    carbs: 40,
    protein: 30,
    fats: 18,
    selected: false,
  },
  {
    id: "3",
    date: "2028-09-01",
    time: "16:00",
    menu: "Greek Yogurt with Mixed Berries",
    amount: "1 Cup",
    cals: 200,
    carbs: 18,
    protein: 12,
    fats: 10,
    selected: false,
  },
  {
    id: "4",
    date: "2028-09-01",
    time: "19:00",
    menu: "Cheeseburger and Fries",
    amount: "1 Serving",
    cals: 700,
    carbs: 55,
    protein: 35,
    fats: 35,
    selected: false,
  },
  {
    id: "5",
    date: "2028-09-02",
    time: "08:00",
    menu: "Avocado Toast with Poached Egg",
    amount: "2 Slices",
    cals: 320,
    carbs: 30,
    protein: 14,
    fats: 18,
    selected: false,
  },
  {
    id: "6",
    date: "2028-09-02",
    time: "13:00",
    menu: "Quinoa Salad with Roasted Veggies & Feta",
    amount: "1 Bowl",
    cals: 450,
    carbs: 50,
    protein: 15,
    fats: 12,
    selected: false,
  },
  {
    id: "7",
    date: "2028-09-02",
    time: "15:30",
    menu: "Apple Slices with Peanut Butter",
    amount: "1 Apple",
    cals: 200,
    carbs: 30,
    protein: 6,
    fats: 10,
    selected: false,
  },
  {
    id: "8",
    date: "2028-09-02",
    time: "18:30",
    menu: "Pasta Alfredo with Garlic Bread",
    amount: "1 Plate",
    cals: 650,
    carbs: 60,
    protein: 20,
    fats: 30,
    selected: false,
  },
  {
    id: "9",
    date: "2028-09-03",
    time: "07:15",
    menu: "Blueberry Protein Smoothie",
    amount: "1 Glass",
    cals: 300,
    carbs: 50,
    protein: 20,
    fats: 10,
    selected: false,
  },
  {
    id: "10",
    date: "2028-09-03",
    time: "12:00",
    menu: "Greek Salad with Feta and Olives",
    amount: "1 Bowl",
    cals: 400,
    carbs: 40,
    protein: 12,
    fats: 20,
    selected: false,
  },
  {
    id: "11",
    date: "2028-09-03",
    time: "16:15",
    menu: "Hummus with Carrot Sticks",
    amount: "1 Serving",
    cals: 180,
    carbs: 20,
    protein: 8,
    fats: 7,
    selected: false,
  },
  {
    id: "12",
    date: "2028-09-03",
    time: "19:00",
    menu: "Chocolate Cake and Ice Cream",
    amount: "1 Serving",
    cals: 600,
    carbs: 75,
    protein: 8,
    fats: 25,
    selected: false,
  },
  ...Array.from({ length: 72 }, (_, i) => {
    const hour = 7 + Math.floor(i / 6);
    const minute = (i % 6) * 10;
    return {
      id: (i + 13).toString(),
      date: "2028-09-04",
      time: `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`,
      menu: [
        "Oatmeal with Fresh Fruit",
        "Turkey Sandwich on Whole Wheat",
        "Mixed Nuts and Dried Fruit",
        "Salmon with Roasted Vegetables",
        "Protein Bar",
        "Caesar Salad with Grilled Chicken",
        "Cottage Cheese with Pineapple",
        "Beef Stir Fry with Rice",
        "Veggie Burger with Sweet Potato Fries",
        "Trail Mix",
        "Tuna Salad Wrap",
        "Chocolate Protein Shake",
      ][i % 12],
      amount: [
        "1 Bowl",
        "1 Serving",
        "1 Cup",
        "1 Plate",
        "1 Bar",
        "1 Portion",
      ][i % 6],
      cals: 200 + (i % 5) * 100,
      carbs: 20 + (i % 6) * 10,
      protein: 10 + (i % 4) * 5,
      fats: 5 + (i % 5) * 5,
      selected: false,
    };
  }),
];

export function FoodDatabasePanel({
  isOpen,
  onClose,
  onSelectFood,
}: FoodDatabasePanelProps) {
  const [foodData, setFoodData] = useState<FoodItem[]>(initialFoodData);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [timeFilter, setTimeFilter] = useState("This Week");
  const itemsPerPage = 12;

  const filteredData = foodData.filter(
    (item) =>
      item.menu.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.amount.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  const toggleSelection = (id: string) => {
    setFoodData((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, selected: !item.selected } : item
      )
    );
  };

  const updateFoodItem = (id: string, field: keyof FoodItem, value: any) => {
    setFoodData((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const handleAddSelected = () => {
    const selectedItems = foodData.filter((item) => item.selected);
    if (selectedItems.length > 0) {
      onSelectFood(selectedItems);
      setFoodData(prev => prev.map(item => ({ ...item, selected: false })));
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <>

      {/* Backdrop with blur */}
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-lg z-70 transition-all duration-300"
        onClick={onClose}
      />
      

      {/* Slide-in Panel - RIGHT SIDE */}
     {/* Slide-in Panel - LEFT SIDE */}
<div className="fixed left-0 top-0 h-full w-1/2 bg-white shadow-2xl z-120 flex flex-col animate-slide-in">

        {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white flex-shrink-0">
      <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="hover:bg-gray-200"
            >
              <ChevronLeft className="w-5 h-5 mr-1" />
              Back
            </Button>
            <h2 className="text-xl font-semibold text-slate-900">
              Food Database
            </h2>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="hover:bg-gray-200"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-4 p-4 border-b border-gray-200 bg-white">
          <div className="flex items-center gap-3 flex-1">
            <div className="flex items-center gap-2 flex-1 max-w-sm">
              <Search className="w-4 h-4 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search menu"
                className="h-10 bg-gray-50 border-gray-300 flex-1"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-gray-300"
            >
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-gray-300 bg-white hover:bg-slate-50"
              asChild
            >
              <Link href="/recipes">
                <Plus className="w-4 h-4 mr-2" />
                Create Recipe
              </Link>
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <Select
              value={timeFilter}
              onValueChange={setTimeFilter}
            >
              <SelectTrigger className="w-40 h-10 border-2 border-gray-300 bg-white hover:border-gray-400 shadow-sm rounded-lg font-medium text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-lg border-2 border-gray-200 shadow-lg bg-white" style={{ zIndex: 60 }}>
                <SelectItem value="This Week" className="font-medium hover:bg-[#BCEBCB] cursor-pointer py-2.5 px-3">This Week</SelectItem>
                <SelectItem value="Last Week" className="font-medium hover:bg-[#BCEBCB] cursor-pointer py-2.5 px-3">Last Week</SelectItem>
                <SelectItem value="This Month" className="font-medium hover:bg-[#BCEBCB] cursor-pointer py-2.5 px-3">This Month</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={handleAddSelected}
              style={{ backgroundColor: '#00A63E', color: 'white' }}
              className="hover:opacity-90 font-medium h-10"
              disabled={!foodData.some((item) => item.selected)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto p-6">
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider w-8"></th>
                  <th className="text-left p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Menu
                  </th>
                  <th className="text-left p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="text-left p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Cals
                  </th>
                  <th className="text-left p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Carbs
                  </th>
                  <th className="text-left p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Protein
                  </th>
                  <th className="text-left p-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Fats
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => toggleSelection(item.id)}
                    style={item.selected ? { backgroundColor: '#BCEBCB' } : {}}
                    className={`border-b border-gray-100 cursor-pointer transition-colors ${
                      item.selected 
                        ? "hover:brightness-95" 
                        : "hover:bg-slate-50"
                    }`}
                    onMouseEnter={(e) => {
                      if (item.selected) {
                        e.currentTarget.style.backgroundColor = '#C2E66E';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (item.selected) {
                        e.currentTarget.style.backgroundColor = '#BCEBCB';
                      }
                    }}
                  >
                    <td className="p-4" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={item.selected}
                        onCheckedChange={() => toggleSelection(item.id)}
                        className="border-gray-300"
                      />
                    </td>
                    <td className="p-4">
                      <div className="text-sm font-medium text-slate-900">{item.menu}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-slate-700">{item.amount}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm font-medium text-slate-900">{item.cals} <span className="text-xs text-slate-500">kcal</span></div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-slate-700">{item.carbs} <span className="text-xs text-slate-500">gr</span></div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-slate-700">{item.protein} <span className="text-xs text-slate-500">gr</span></div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm text-slate-700">{item.fats} <span className="text-xs text-slate-500">gr</span></div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer with Pagination */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            Showing {startIndex + 1} out of {filteredData.length}
          </div>
          <div className="flex items-center gap-2">
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              if (totalPages <= 7) {
                return i + 1;
              } else if (i === 3) {
                return "...";
              } else if (i < 3) {
                return i + 1;
              } else {
                return totalPages - (6 - i);
              }
            }).map((page, i) => (
              <Button
                key={i}
                variant={currentPage === page ? "default" : "outline"}
                size="sm"
                onClick={() =>
                  typeof page === "number" && setCurrentPage(page)
                }
                disabled={page === "..."}
                style={currentPage === page ? { backgroundColor: '#00A63E', color: 'white', borderColor: '#00A63E' } : {}}
                className={`w-9 h-9 p-0 ${
                  currentPage === page
                    ? "hover:opacity-90"
                    : "border-gray-300"
                }`}
              >
                {page}
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setCurrentPage((prev) =>
                  Math.min(prev + 1, totalPages)
                )
              }
              disabled={currentPage === totalPages}
              className="w-9 h-9 p-0 border-gray-300"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <style>{`
       @keyframes slide-in {
  from {
    transform: translateX(-100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

      `}</style>
    </>
  );
}