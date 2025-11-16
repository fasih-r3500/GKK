import { StatusBar } from "expo-status-bar";
import { Heart, Home, Search, ShoppingBag, Star, User } from "lucide-react-native";
import React, { useState } from "react";
import {
  FlatList,
  Image,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import "./global.css";

// Dummy data for kitchens
const kitchens = [
  {
    id: "1",
    name: "Ayesha’s Kitchen",
    rating: 4.8,
    image:
      "https://images.unsplash.com/photo-1600891964599-f61ba0e24092?w=600&q=80",
  },
  {
    id: "2",
    name: "Tariq’s Tandoor",
    rating: 4.5,
    image:
      "https://images.unsplash.com/photo-1550547660-d9450f859349?w=600&q=80",
  },
  {
    id: "3",
    name: "Home by Sana",
    rating: 4.9,
    image:
      "https://images.unsplash.com/photo-1600891964599-f61ba0e24092?w=600&q=80",
  },
  {
    id: "4",
    name: "Khana by Kareem",
    rating: 4.6,
    image:
      "https://images.unsplash.com/photo-1550547660-d9450f859349?w=600&q=80",
  },
];

export default function Index() {
  const [activeTab, setActiveTab] = useState("Home");

  return (
    <SafeAreaView className="flex-1 bg-white">
    <StatusBar style="dark" />

      {/* Header */}
      <View className="flex-row justify-between items-center w-full my-2 px-5">
        <View>
          <Text className="font-book text-green-100">Deliver To</Text>
          <TouchableOpacity className="flex-row items-center gap-x-1 mt-0.5">
            <Text className="font-regular text-green-600">
              Alpine Homes, Clifton Block 5
            </Text>
            <Image
              source={require("../assets/images/location.png")}
              className="w-4 h-5"
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity className="flex-row items-center gap-x-1">
          <ShoppingBag color="#76ab85" size={18} />
          <Text className="font-regular text-green-100">Cart</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View className="flex-row items-center bg-gray-100 mx-5 rounded-full px-4 py-2">
        <Search size={20} color="gray" />
        <TextInput
          placeholder="Search for food or kitchens"
          className="flex-1 ml-2 mb-1 text-base"
          placeholderTextColor="#888"
        />
      </View>

      {/* Kitchen List */}
      <FlatList
        data={kitchens}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 20 }}
        renderItem={({ item }) => (
          <View className="flex-row items-center bg-gray-50 rounded-2xl mb-4 p-3 shadow-sm">
            {/* Kitchen Image */}
            <Image
              source={{ uri: item.image }}
              className="w-20 h-20 rounded-xl mr-4"
            />

            {/* Kitchen Info */}
            <View className="flex-1">
              <Text className="text-lg font-heavy text-gray-800">
                {item.name}
              </Text>

              <View className="flex-row items-center mt-1">
                <Star size={16} color="#facc15" fill="#facc15" />
                <Text className="ml-1 text-sm font-regular text-gray-600">
                  {item.rating} · Top Rated
                </Text>
              </View>

              <TouchableOpacity className="bg-green-100 mt-3 rounded-full py-1.5 px-4 self-start">
                <Text className="font-book text-white text-sm">View Kitchen</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      {/* Bottom Navbar */}
      <View className="flex-row justify-around items-center bg-white shadow-inner py-3 border-t border-gray-200">
        {/* Home Tab */}
        <TouchableOpacity
          className="flex-col items-center"
          onPress={() => setActiveTab("Home")}
        >
          <Home
            size={24}
            color={activeTab === "Home" ? "#76ab85" : "#999"}
          />
          <Text
            className={`text-xs ${
              activeTab === "Home" ? "text-green-600 font-heavy" : "text-gray-400"
            }`}
          >
            Home
          </Text>
        </TouchableOpacity>

        {/* Search Tab */}
        {/* <TouchableOpacity
          className="flex-col items-center"
          onPress={() => setActiveTab("Search")}
        >
          <SearchIcon
            size={24}
            color={activeTab === "Search" ? "#76ab85" : "#999"}
          />
          <Text
            className={`text-xs ${
              activeTab === "Search" ? "text-green-600 font-heavy" : "text-gray-400"
            }`}
          >
            Search
          </Text>
        </TouchableOpacity> */}

        {/* Orders / Heart Tab */}
        <TouchableOpacity
          className="flex-col items-center"
          onPress={() => setActiveTab("Orders")}
        >
          <Heart
            size={24}
            color={activeTab === "Orders" ? "#76ab85" : "#999"}
          />
          <Text
            className={`text-xs ${
              activeTab === "Orders" ? "text-green-600 font-heavy" : "text-gray-400"
            }`}
          >
            Orders
          </Text>
        </TouchableOpacity>

        {/* Profile Tab */}
        <TouchableOpacity
          className="flex-col items-center"
          onPress={() => setActiveTab("Profile")}
        >
          <User
            size={24}
            color={activeTab === "Profile" ? "#76ab85" : "#999"}
          />
          <Text
            className={`text-xs ${
              activeTab === "Profile" ? "text-green-600 font-heavy" : "text-gray-400"
            }`}
          >
            Profile
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
