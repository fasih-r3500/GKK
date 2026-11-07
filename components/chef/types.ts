export interface ChefProfile {
  id: string;
  kitchen_name: string;
  bio: string | null;
  kitchen_address: string;
  cuisine_types: string[] | null;
  kitchen_image: string | null;
  is_accepting_orders: boolean;
}

export interface ChefDish {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string | null;
  cuisine_type: string | null;
  dietary_info: string[] | null;
  spice_level: number | null;
  preparation_time: number | null;
  serving_size: string | null;
  ingredients: string[] | null;
  image_url: string | null;
  is_available: boolean;
}
