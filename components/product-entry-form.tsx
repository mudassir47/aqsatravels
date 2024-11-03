// components/ProductEntryForm.tsx
'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import axios from 'axios'

import { ref, get, push, set } from "firebase/database"
import { database } from '@/lib/firebase'

interface ServiceDetail {
  id: string
  name: string
  description: string
  price: number
  createdAt: string
}

export function ProductEntryForm() {
  const [searchTerm, setSearchTerm] = useState('')
  const [products, setProducts] = useState<ServiceDetail[]>([])
  const [filteredProducts, setFilteredProducts] = useState<ServiceDetail[]>([])
  const [selectedProduct, setSelectedProduct] = useState<ServiceDetail | null>(null)
  const [price, setPrice] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [showSuggestions, setShowSuggestions] = useState(false)

  // Fetch products on component mount
  useEffect(() => {
    const fetchProducts = async () => {
      const servicedetailsRef = ref(database, 'servicedetails')
      try {
        const snapshot = await get(servicedetailsRef)
        if (snapshot.exists()) {
          const data = snapshot.val()
          const productsList: ServiceDetail[] = Object.keys(data).map(key => ({
            id: key,
            name: data[key].name,
            description: data[key].description,
            price: data[key].price,
            createdAt: data[key].createdAt,
          }))
          setProducts(productsList)
        } else {
          setProducts([])
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      }
    }

    fetchProducts()
  }, [])

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchTerm(value)
    if (value.trim() === '') {
      setFilteredProducts([])
      setShowSuggestions(false)
      return
    }

    const filtered = products.filter(product =>
      product.name.toLowerCase().includes(value.toLowerCase())
    )
    setFilteredProducts(filtered)
    setShowSuggestions(true)
  }

  const handleSelectProduct = (product: ServiceDetail) => {
    setSelectedProduct(product)
    setPrice(product.price.toFixed(2))
    setSearchTerm(product.name)
    setShowSuggestions(false)
    setMessage(null)
  }

  const handleSell = async () => {
    if (!selectedProduct) {
      setMessage({ type: 'error', text: "No product selected to sell." })
      return
    }

    if (!price || parseFloat(price) < 0) {
      setMessage({ type: 'error', text: "Please enter a valid price." })
      return
    }

    const sellRef = ref(database, 'sell')
    const newSellRef = push(sellRef)

    const sellData = {
      productId: selectedProduct.id,
      name: selectedProduct.name,
      description: selectedProduct.description,
      price: parseFloat(price),
      phoneNumber: phoneNumber.trim() || null,
      soldAt: new Date().toISOString(),
    }

    try {
      await set(newSellRef, sellData)

      // Send WhatsApp message if phone number is provided
      if (phoneNumber.trim()) {
        await sendWhatsAppMessage(selectedProduct.description, phoneNumber)
      }

      setMessage({ type: 'success', text: "Product sold successfully." })
      // Reset form
      setSelectedProduct(null)
      setPrice('')
      setSearchTerm('')
      setPhoneNumber('')
    } catch (error) {
      console.error('Error selling product:', error)
      setMessage({ type: 'error', text: "Failed to sell product." })
    }
  }

  const sendWhatsAppMessage = async (message: string, phoneNumber: string) => {
    try {
      const response = await axios.post('http://localhost:5000/send-message', {
        phoneNumber,
        message,
      });
      if (response.data.success) {
        console.log('Message sent successfully');
      }
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      setMessage({ type: 'error', text: "Failed to send WhatsApp message." });
    }
  }

  return (
    <div className="container mx-auto py-10 px-4 sm:px-6 lg:px-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="bg-[#0a1963] text-white">
          <CardTitle className="text-2xl font-bold">Product Entry</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {message && (
            <div
              className={`mb-4 p-2 text-sm rounded ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
            >
              {message.text}
            </div>
          )}
          <div className="space-y-4">
            <div className="relative">
              <Label htmlFor="productSearch" className="sr-only">
                Search for a product
              </Label>
              <Input
                id="productSearch"
                type="text"
                placeholder="Search for a product..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="w-full"
                onFocus={() => setShowSuggestions(filteredProducts.length > 0)}
              />
              {showSuggestions && filteredProducts.length > 0 && (
                <ul className="absolute z-10 bg-white border border-gray-300 w-full mt-1 max-h-40 overflow-y-auto">
                  {filteredProducts.map((product) => (
                    <li
                      key={product.id}
                      className="p-2 hover:bg-gray-100 cursor-pointer"
                      onClick={() => handleSelectProduct(product)}
                    >
                      {product.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {selectedProduct && (
              <div className="space-y-4 border-t pt-4">
                <div>
                  <Label htmlFor="productName">Product Name</Label>
                  <Input
                    id="productName"
                    value={selectedProduct.name}
                    readOnly
                    className="bg-gray-100"
                  />
                </div>
                <div>
                  <Label htmlFor="productDescription">Description</Label>
                  <Input
                    id="productDescription"
                    value={selectedProduct.description}
                    readOnly
                    className="bg-gray-100"
                  />
                </div>
                <div>
                  <Label htmlFor="productPrice">Price (Rs)</Label>
                  <Input
                    id="productPrice"
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    step="0.01"
                    min="0"
                  />
                </div>
                <div>
                  <Label htmlFor="phoneNumber">Phone Number (Optional)</Label>
                  <Input
                    id="phoneNumber"
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="Enter phone number"
                  />
                </div>
                <Button
                  onClick={handleSell}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                >
                  Sell Product
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default ProductEntryForm;
