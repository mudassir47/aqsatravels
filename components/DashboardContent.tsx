// components/DashboardContent.tsx
'use client';

import { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell, ChevronDown, Users, Briefcase, BarChart, Settings, LogOut, User } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { signOut } from 'firebase/auth';
import { auth, database } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart as ReBarChart,
  Bar,
} from 'recharts';
import { ref, onValue } from 'firebase/database';
import { Label } from "@/components/ui/label";


// Define the structure of a Sell record
interface SellRecord {
  id: string;
  productId: string;
  name: string;
  description: string;
  price: number;
  phoneNumber?: string | null;
  soldAt: string; // ISO string
}

const DashboardContent: React.FC = () => {
  const { user } = useAuth();
  const router = useRouter();

  const [sells, setSells] = useState<SellRecord[]>([]);
  const [todaySells, setTodaySells] = useState<SellRecord[]>([]);
  const [monthlySells, setMonthlySells] = useState<SellRecord[]>([]);
  const [yearlySells, setYearlySells] = useState<SellRecord[]>([]);
  const [totalProductsSold, setTotalProductsSold] = useState<number>(0);
  const [totalMoneyCollected, setTotalMoneyCollected] = useState<number>(0);
  const [filteredMonth, setFilteredMonth] = useState<string>('All');
  const [filteredYear, setFilteredYear] = useState<string>('All');

  // Function to handle logout
  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  // Fetch sell data from Firebase Realtime Database
  useEffect(() => {
    const sellRef = ref(database, 'sell');
    const unsubscribe = onValue(sellRef, (snapshot) => {
      const data = snapshot.val();
      const sellList: SellRecord[] = [];

      for (const key in data) {
        sellList.push({
          id: key,
          productId: data[key].productId,
          name: data[key].name,
          description: data[key].description,
          price: data[key].price,
          phoneNumber: data[key].phoneNumber || null,
          soldAt: data[key].soldAt,
        });
      }

      setSells(sellList);
    });

    return () => unsubscribe();
  }, []);

  // Process sell data for today, month, and year
  useEffect(() => {
    const today = new Date();
    const currentMonth = today.getMonth(); // 0-indexed
    const currentYear = today.getFullYear();

    const todaySellsFiltered = sells.filter((sell) => {
      const soldDate = new Date(sell.soldAt);
      return (
        soldDate.getDate() === today.getDate() &&
        soldDate.getMonth() === currentMonth &&
        soldDate.getFullYear() === currentYear
      );
    });

    const monthlySellsFiltered = sells.filter((sell) => {
      const soldDate = new Date(sell.soldAt);
      return (
        soldDate.getMonth() === currentMonth &&
        soldDate.getFullYear() === currentYear
      );
    });

    const yearlySellsFiltered = sells.filter((sell) => {
      const soldDate = new Date(sell.soldAt);
      return soldDate.getFullYear() === currentYear;
    });

    setTodaySells(todaySellsFiltered);
    setMonthlySells(monthlySellsFiltered);
    setYearlySells(yearlySellsFiltered);

    // Calculate total products sold and total money collected
    const totalProducts = sells.length;
    const totalMoney = sells.reduce((acc, sell) => acc + sell.price, 0);

    setTotalProductsSold(totalProducts);
    setTotalMoneyCollected(totalMoney);
  }, [sells]);

  // Function to handle filtering by month and year
  const handleFilter = () => {
    let filtered = sells;

    if (filteredMonth !== 'All') {
      const monthIndex = new Date(`${filteredMonth} 1, 2020`).getMonth(); // Convert month name to index
      filtered = filtered.filter((sell) => {
        const soldDate = new Date(sell.soldAt);
        return soldDate.getMonth() === monthIndex;
      });
    }

    if (filteredYear !== 'All') {
      const year = parseInt(filteredYear);
      filtered = filtered.filter((sell) => {
        const soldDate = new Date(sell.soldAt);
        return soldDate.getFullYear() === year;
      });
    }

    // Update filtered sells
    setSells(filtered);
  };

  // Function to reset filters
  const resetFilters = () => {
    setFilteredMonth('All');
    setFilteredYear('All');
    // Fetch all sells again
    const sellRef = ref(database, 'sell');
    onValue(sellRef, (snapshot) => {
      const data = snapshot.val();
      const sellList: SellRecord[] = [];

      for (const key in data) {
        sellList.push({
          id: key,
          productId: data[key].productId,
          name: data[key].name,
          description: data[key].description,
          price: data[key].price,
          phoneNumber: data[key].phoneNumber || null,
          soldAt: data[key].soldAt,
        });
      }

      setSells(sellList);
    });
  };

  // Prepare data for Line Chart (Monthly Sales)
  const lineChartData = Array.from({ length: 12 }, (_, index) => {
    const month = new Date(0, index).toLocaleString('default', { month: 'short' });
    const monthlyTotal = sells
      .filter((sell) => new Date(sell.soldAt).getMonth() === index)
      .reduce((acc, sell) => acc + sell.price, 0);
    return { month, sales: monthlyTotal };
  });

  // Prepare data for Bar Chart (Yearly Sales)
  const currentYear = new Date().getFullYear();
  const barChartData = Array.from({ length: 12 }, (_, index) => {
    const month = new Date(0, index).toLocaleString('default', { month: 'short' });
    const monthlyTotal = sells
      .filter((sell) => {
        const soldDate = new Date(sell.soldAt);
        return (
          soldDate.getMonth() === index &&
          soldDate.getFullYear() === currentYear
        );
      })
      .reduce((acc, sell) => acc + sell.price, 0);
    return { month, sales: monthlyTotal };
  });

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white shadow-md">
        <div className="flex items-center justify-between p-4">
          <Button variant="ghost" size="icon">
            <Bell className="h-6 w-6" />
          </Button>
          <div className="flex items-center space-x-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="/placeholder.svg?height=32&width=32" alt="@user" />
                    <AvatarFallback>{user?.email?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-6">
        <h1 className="text-3xl font-semibold text-gray-800 mb-6">Dashboard</h1>

        {/* Filter Section */}
        <div className="flex items-center space-x-4 mb-6">
          <div>
            <Label htmlFor="filterMonth" className="block text-sm font-medium text-gray-700">
              Filter by Month
            </Label>
            <select
              id="filterMonth"
              value={filteredMonth}
              onChange={(e) => setFilteredMonth(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option>All</option>
              <option>January</option>
              <option>February</option>
              <option>March</option>
              <option>April</option>
              <option>May</option>
              <option>June</option>
              <option>July</option>
              <option>August</option>
              <option>September</option>
              <option>October</option>
              <option>November</option>
              <option>December</option>
            </select>
          </div>
          <div>
            <Label htmlFor="filterYear" className="block text-sm font-medium text-gray-700">
              Filter by Year
            </Label>
            <select
              id="filterYear"
              value={filteredYear}
              onChange={(e) => setFilteredYear(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option>All</option>
              {Array.from({ length: 5 }, (_, i) => currentYear - i).map((year) => (
                <option key={year}>{year}</option>
              ))}
            </select>
          </div>
          <Button
            onClick={handleFilter}
            className="bg-indigo-600 hover:bg-indigo-700 text-white h-10"
          >
            Apply
          </Button>
          <Button
            onClick={resetFilters}
            variant="outline"
            className="h-10"
          >
            Reset
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sells Today</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todaySells.length}</div>
              <p className="text-xs text-muted-foreground">
                Rs. {todaySells.reduce((acc, sell) => acc + sell.price, 0).toFixed(2)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sells This Month</CardTitle>
              <BarChart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{monthlySells.length}</div>
              <p className="text-xs text-muted-foreground">
                Rs. {monthlySells.reduce((acc, sell) => acc + sell.price, 0).toFixed(2)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sells This Year</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{yearlySells.length}</div>
              <p className="text-xs text-muted-foreground">
                Rs. {yearlySells.reduce((acc, sell) => acc + sell.price, 0).toFixed(2)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Products Sold</CardTitle>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalProductsSold}</div>
              <p className="text-xs text-muted-foreground">
                Rs. {totalMoneyCollected.toFixed(2)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Monthly Sales (Rs.)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={lineChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => `Rs. ${value.toFixed(2)}`} />
                    <Line type="monotone" dataKey="sales" stroke="#0a1963" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Yearly Sales (Rs.)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ReBarChart data={barChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => `Rs. ${value.toFixed(2)}`} />
                    <Bar dataKey="sales" fill="#0a1963" />
                  </ReBarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Today's Sell List */}
        <Card>
          <CardHeader>
            <CardTitle>Todays Sell List</CardTitle>
          </CardHeader>
          <CardContent>
            {todaySells.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white">
                  <thead>
                    <tr>
                      <th className="py-2 px-4 border-b">Product Name</th>
                      <th className="py-2 px-4 border-b">Description</th>
                      <th className="py-2 px-4 border-b">Price (Rs.)</th>
                      <th className="py-2 px-4 border-b">Phone Number</th>
                      <th className="py-2 px-4 border-b">Sold At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {todaySells.map((sell) => (
                      <tr key={sell.id}>
                        <td className="py-2 px-4 border-b">{sell.name}</td>
                        <td className="py-2 px-4 border-b">{sell.description}</td>
                        <td className="py-2 px-4 border-b">{sell.price.toFixed(2)}</td>
                        <td className="py-2 px-4 border-b">{sell.phoneNumber || 'N/A'}</td>
                        <td className="py-2 px-4 border-b">
                          {new Date(sell.soldAt).toLocaleTimeString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No products sold today.</p>
            )}
            <div className="mt-4">
              <p className="text-sm font-medium">Total Cost Today: Rs. {todaySells.reduce((acc, sell) => acc + sell.price, 0).toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>

        {/* Additional Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Total Products Sold</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalProductsSold}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Total Money Collected</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Rs. {totalMoneyCollected.toFixed(2)}</div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default DashboardContent;
