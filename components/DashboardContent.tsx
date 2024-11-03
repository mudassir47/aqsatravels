"use client"

import { useEffect, useState } from 'react'
import { signOut } from 'firebase/auth'
import { ref, onValue } from 'firebase/database'
import { useRouter } from 'next/navigation'
import { Bell, ChevronDown, Users, Briefcase, BarChart, Settings, LogOut, User, DollarSign, CreditCard } from 'lucide-react'
import { Line, LineChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart as ReBarChart, Bar } from 'recharts'

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { auth, database } from '@/lib/firebase'
import { useAuth } from '@/context/AuthContext'

interface SellRecord {
  id: string
  productId: string
  name: string
  description: string
  price: number
  phoneNumber?: string | null
  soldAt: string
  paymentMethod: 'cash' | 'online'
}

const DashboardContent: React.FC = () => {
  const { user } = useAuth()
  const router = useRouter()
  const [sells, setSells] = useState<SellRecord[]>([])
  const [filteredMonth, setFilteredMonth] = useState<string>('All')
  const [filteredYear, setFilteredYear] = useState<string>('All')

  useEffect(() => {
    const sellRef = ref(database, 'sell')
    const unsubscribe = onValue(sellRef, (snapshot) => {
      const data = snapshot.val()
      const sellList: SellRecord[] = Object.entries(data).map(([key, value]: [string, any]) => ({
        id: key,
        ...value,
      }))
      setSells(sellList)
    })

    return () => unsubscribe()
  }, [])

  const handleLogout = async () => {
    await signOut(auth)
    router.push('/login')
  }

  const filterSells = (sells: SellRecord[], month: string, year: string) => {
    return sells.filter((sell) => {
      const soldDate = new Date(sell.soldAt)
      const monthMatch = month === 'All' || soldDate.getMonth() === new Date(`${month} 1, 2020`).getMonth()
      const yearMatch = year === 'All' || soldDate.getFullYear() === parseInt(year)
      return monthMatch && yearMatch
    })
  }

  const filteredSells = filterSells(sells, filteredMonth, filteredYear)

  const todaySells = filteredSells.filter((sell) => {
    const soldDate = new Date(sell.soldAt)
    const today = new Date()
    return soldDate.toDateString() === today.toDateString()
  })

  const totalProductsSold = filteredSells.length
  const totalMoneyCollected = filteredSells.reduce((acc, sell) => acc + sell.price, 0)
  const totalCashSales = filteredSells.filter(sell => sell.paymentMethod === 'cash').reduce((acc, sell) => acc + sell.price, 0)
  const totalOnlineSales = filteredSells.filter(sell => sell.paymentMethod === 'online').reduce((acc, sell) => acc + sell.price, 0)

  const lineChartData = Array.from({ length: 12 }, (_, index) => {
    const month = new Date(0, index).toLocaleString('default', { month: 'short' })
    const monthlyCashTotal = filteredSells
      .filter((sell) => sell.paymentMethod === 'cash' && new Date(sell.soldAt).getMonth() === index)
      .reduce((acc, sell) => acc + sell.price, 0)
    const monthlyOnlineTotal = filteredSells
      .filter((sell) => sell.paymentMethod === 'online' && new Date(sell.soldAt).getMonth() === index)
      .reduce((acc, sell) => acc + sell.price, 0)
    return { month, Cash: monthlyCashTotal, Online: monthlyOnlineTotal }
  })

  const barChartData = lineChartData

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <header className="bg-white shadow-md">
        <div className="flex items-center justify-between p-4">
          <Button variant="ghost" size="icon">
            <Bell className="h-6 w-6" />
          </Button>
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
      </header>

      <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-6">
        <h1 className="text-3xl font-semibold text-gray-800 mb-6">Dashboard</h1>

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
              {Array.from({ length: 12 }, (_, i) => new Date(0, i).toLocaleString('default', { month: 'long' })).map((month) => (
                <option key={month}>{month}</option>
              ))}
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
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                <option key={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          <StatCard title="Total Sells Today" icon={Briefcase} value={todaySells.length} subvalue={`Rs. ${todaySells.reduce((acc, sell) => acc + sell.price, 0).toFixed(2)}`} />
          <StatCard title="Total Products Sold" icon={ChevronDown} value={totalProductsSold} subvalue={`Rs. ${totalMoneyCollected.toFixed(2)}`} />
          <StatCard title="Total Cash Sales" icon={DollarSign} value={`Rs. ${totalCashSales.toFixed(2)}`} subvalue={`${filteredSells.filter(sell => sell.paymentMethod === 'cash').length} Transactions`} />
          <StatCard title="Total Online Sales" icon={CreditCard} value={`Rs. ${totalOnlineSales.toFixed(2)}`} subvalue={`${filteredSells.filter(sell => sell.paymentMethod === 'online').length} Transactions`} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <ChartCard title="Monthly Sales by Payment Method (Rs.)" chart={<LineChartComponent data={lineChartData} />} />
          <ChartCard title="Yearly Sales by Payment Method (Rs.)" chart={<BarChartComponent data={barChartData} />} />
        </div>

        <Card className="h-96">
          <CardHeader>
            <CardTitle>Today's Sell List</CardTitle>
          </CardHeader>
          <CardContent className="overflow-y-auto">
            <SellTable sells={todaySells} />
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

const StatCard: React.FC<{ title: string; icon: React.ElementType; value: string | number; subvalue: string }> = ({ title, icon: Icon, value, subvalue }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      <p className="text-xs text-muted-foreground">{subvalue}</p>
    </CardContent>
  </Card>
)

const ChartCard: React.FC<{ title: string; chart: React.ReactNode }> = ({ title, chart }) => (
  <Card>
    <CardHeader>
      <CardTitle>{title}</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="h-[300px]">
        {chart}
      </div>
    </CardContent>
  </Card>
)

const LineChartComponent: React.FC<{ data: any[] }> = ({ data }) => (
  <ResponsiveContainer width="100%" height="100%">
    <LineChart data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="month" />
      <YAxis />
      <Tooltip formatter={(value: number) => `Rs. ${value.toFixed(2)}`} />
      <Legend />
      <Line type="monotone" dataKey="Cash" stroke="#0a1963" strokeWidth={2} />
      <Line type="monotone" dataKey="Online" stroke="#f59e0b" strokeWidth={2} />
    </LineChart>
  </ResponsiveContainer>
)

const BarChartComponent: React.FC<{ data: any[] }> = ({ data }) => (
  <ResponsiveContainer width="100%" height="100%">
    <ReBarChart data={data}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="month" />
      <YAxis />
      <Tooltip formatter={(value: number) => `Rs. ${value.toFixed(2)}`} />
      <Legend />
      <Bar dataKey="Cash" fill="#0a1963" />
      <Bar dataKey="Online" fill="#f59e0b" />
    </ReBarChart>
  </ResponsiveContainer>
)

const SellTable: React.FC<{ sells: SellRecord[] }> = ({ sells }) => (
  <>
    {sells.length > 0 ? (
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white">
          <thead>
            <tr>
              <th className="py-2 px-4 border-b">Product Name</th>
              <th className="py-2 px-4 border-b">Description</th>
              <th className="py-2 px-4 border-b">Price (Rs.)</th>
              <th className="py-2 px-4 border-b">Payment Method</th>
              <th className="py-2 px-4 border-b">Phone Number</th>
              <th className="py-2 px-4 border-b">Sold At</th>
            </tr>
          </thead>
          <tbody>
            {sells.map((sell) => (
              <tr key={sell.id}>
                <td className="py-2 px-4 border-b">{sell.name}</td>
                <td className="py-2 px-4 border-b">{sell.description}</td>
                <td className="py-2 px-4 border-b">{sell.price.toFixed(2)}</td>
                <td className="py-2 px-4 border-b capitalize">{sell.paymentMethod}</td>
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
      <p className="text-sm font-medium">Total Cost Today: Rs. {sells.reduce((acc, sell) => acc + sell.price, 0).toFixed(2)}</p>
    </div>
  </>
)

export default DashboardContent