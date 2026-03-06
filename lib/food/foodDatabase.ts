// ─── SBH Food Database ────────────────────────────────────────────────────────
// Curated list of ~75 Indian + everyday foods with accurate macro estimates.
// Used for instant client-side search on the Nutrition page.
// gi: Glycaemic Index (0–100). Source: University of Sydney GI database, published literature.
// fibreG: dietary fibre per serving in grams.

export type FoodCategory =
  | 'indian_main'
  | 'indian_bread'
  | 'indian_snack'
  | 'indian_dairy'
  | 'indian_sweet'
  | 'protein'
  | 'carb'
  | 'dairy'
  | 'fat'
  | 'veg'
  | 'fruit'
  | 'uk_main'
  | 'nut_seed'
  | 'supplement'

export interface FoodEntry {
  emoji: string
  name: string
  calories: number   // per serving
  proteinG: number
  carbsG: number
  fatG: number
  servingSize: string
  tags: string[]     // extra searchable keywords
  category: FoodCategory
  gi?: number        // Glycaemic Index (0–100). Omitted for pure proteins/fats with negligible carbs.
  fibreG?: number    // dietary fibre per serving (grams)
}

export const FOOD_DATABASE: FoodEntry[] = [
  // ─── Indian Mains — Dal & Lentils ─────────────────────────────────────────
  {
    emoji: '🫘', name: 'Toor Dal',         calories: 230, proteinG: 18, carbsG: 40, fatG: 1,
    servingSize: '1 cup cooked (240g)',
    tags: ['toor', 'arhar', 'dal', 'lentil', 'indian'], category: 'indian_main',
    gi: 29, fibreG: 7,
  },
  {
    emoji: '🫘', name: 'Chana Dal',        calories: 269, proteinG: 14, carbsG: 45, fatG: 4,
    servingSize: '1 cup cooked (240g)',
    tags: ['chana', 'dal', 'lentil', 'indian', 'chickpea'], category: 'indian_main',
    gi: 27, fibreG: 8,
  },
  {
    emoji: '🫘', name: 'Moong Dal',        calories: 212, proteinG: 14, carbsG: 38, fatG: 1,
    servingSize: '1 cup cooked (240g)',
    tags: ['moong', 'mung', 'dal', 'lentil', 'indian'], category: 'indian_main',
    gi: 31, fibreG: 8,
  },
  {
    emoji: '🫘', name: 'Dal Makhani',      calories: 320, proteinG: 13, carbsG: 38, fatG: 13,
    servingSize: '1 cup (250g)',
    tags: ['dal', 'makhani', 'black dal', 'urad', 'indian', 'punjabi'], category: 'indian_main',
    gi: 33, fibreG: 9,
  },
  {
    emoji: '🫘', name: 'Dal Tadka',        calories: 200, proteinG: 12, carbsG: 30, fatG: 6,
    servingSize: '1 cup (240g)',
    tags: ['dal', 'tadka', 'tarka', 'indian', 'lentil'], category: 'indian_main',
    gi: 31, fibreG: 7,
  },
  {
    emoji: '🫘', name: 'Moong Dal Cheela', calories: 150, proteinG: 10, carbsG: 22, fatG: 4,
    servingSize: '2 pieces (120g)',
    tags: ['cheela', 'chilla', 'moong', 'pancake', 'breakfast', 'indian'], category: 'indian_snack',
    gi: 35, fibreG: 3,
  },

  // ─── Indian Mains — Legumes ────────────────────────────────────────────────
  {
    emoji: '🫘', name: 'Rajma',            calories: 225, proteinG: 15, carbsG: 40, fatG: 1,
    servingSize: '1 cup cooked (240g)',
    tags: ['rajma', 'kidney beans', 'dal', 'indian', 'punjabi'], category: 'indian_main',
    gi: 29, fibreG: 10,
  },
  {
    emoji: '🫘', name: 'Chana Masala',     calories: 270, proteinG: 12, carbsG: 42, fatG: 7,
    servingSize: '1 cup (250g)',
    tags: ['chana', 'chickpea', 'chole', 'masala', 'indian'], category: 'indian_main',
    gi: 33, fibreG: 8,
  },
  {
    emoji: '🫘', name: 'Chole Bhature',    calories: 520, proteinG: 14, carbsG: 72, fatG: 20,
    servingSize: '1 serving (1 bhatura + ½ cup chole)',
    tags: ['chole', 'bhature', 'chana', 'punjabi', 'indian'], category: 'indian_main',
    gi: 65, fibreG: 5,
  },

  // ─── Indian Mains — Vegetable Curries ─────────────────────────────────────
  {
    emoji: '🧀', name: 'Palak Paneer',     calories: 280, proteinG: 12, carbsG: 14, fatG: 20,
    servingSize: '1 cup (250g)',
    tags: ['palak', 'paneer', 'spinach', 'curry', 'indian'], category: 'indian_main',
    gi: 25, fibreG: 4,
  },
  {
    emoji: '🧀', name: 'Shahi Paneer',     calories: 340, proteinG: 14, carbsG: 18, fatG: 24,
    servingSize: '1 cup (250g)',
    tags: ['shahi', 'paneer', 'curry', 'indian', 'rich'], category: 'indian_main',
    gi: 28, fibreG: 2,
  },
  {
    emoji: '🥬', name: 'Aloo Gobi',        calories: 150, proteinG: 4,  carbsG: 24, fatG: 5,
    servingSize: '1 cup (200g)',
    tags: ['aloo', 'gobi', 'potato', 'cauliflower', 'sabzi', 'indian'], category: 'indian_main',
    gi: 55, fibreG: 4,
  },
  {
    emoji: '🍆', name: 'Baingan Bharta',   calories: 130, proteinG: 3,  carbsG: 16, fatG: 6,
    servingSize: '1 cup (200g)',
    tags: ['baingan', 'bharta', 'aubergine', 'eggplant', 'indian'], category: 'indian_main',
    gi: 15, fibreG: 5,
  },
  {
    emoji: '🌿', name: 'Bhindi Masala',    calories: 120, proteinG: 3,  carbsG: 15, fatG: 5,
    servingSize: '1 cup (200g)',
    tags: ['bhindi', 'okra', 'ladies finger', 'sabzi', 'indian'], category: 'indian_main',
    gi: 20, fibreG: 4,
  },
  {
    emoji: '🥬', name: 'Saag',             calories: 160, proteinG: 5,  carbsG: 14, fatG: 9,
    servingSize: '1 cup (220g)',
    tags: ['saag', 'sarson', 'mustard', 'greens', 'punjabi', 'indian'], category: 'indian_main',
    gi: 15, fibreG: 4,
  },
  {
    emoji: '🍲', name: 'Sambar',           calories: 130, proteinG: 7,  carbsG: 20, fatG: 3,
    servingSize: '1 cup (240g)',
    tags: ['sambar', 'south indian', 'dal', 'lentil', 'tamarind'], category: 'indian_main',
    gi: 30, fibreG: 4,
  },

  // ─── Indian Mains — Meat & Poultry ────────────────────────────────────────
  {
    emoji: '🍗', name: 'Chicken Curry',    calories: 340, proteinG: 32, carbsG: 10, fatG: 18,
    servingSize: '1 serving (200g)',
    tags: ['chicken', 'curry', 'masala', 'indian'], category: 'indian_main',
    gi: 15, fibreG: 1,
  },
  {
    emoji: '🍗', name: 'Chicken Tikka',    calories: 225, proteinG: 32, carbsG: 4,  fatG: 9,
    servingSize: '150g (6–8 pieces)',
    tags: ['chicken', 'tikka', 'tandoor', 'indian', 'bbq', 'grill'], category: 'indian_main',
    gi: 5, fibreG: 0,
  },
  {
    emoji: '🍗', name: 'Tandoori Chicken', calories: 240, proteinG: 38, carbsG: 6,  fatG: 7,
    servingSize: '½ chicken (200g)',
    tags: ['tandoori', 'chicken', 'tandoor', 'grill', 'indian'], category: 'indian_main',
    gi: 5, fibreG: 0,
  },
  {
    emoji: '🍗', name: 'Butter Chicken',   calories: 370, proteinG: 28, carbsG: 16, fatG: 22,
    servingSize: '1 cup (250g)',
    tags: ['butter chicken', 'murgh makhani', 'makhani', 'indian', 'punjabi'], category: 'indian_main',
    gi: 18, fibreG: 1,
  },
  {
    emoji: '🥚', name: 'Egg Curry',        calories: 220, proteinG: 14, carbsG: 8,  fatG: 15,
    servingSize: '2 eggs with gravy',
    tags: ['egg', 'anda', 'curry', 'masala', 'indian'], category: 'indian_main',
    gi: 10, fibreG: 1,
  },
  {
    emoji: '🐑', name: 'Mutton Curry',     calories: 380, proteinG: 28, carbsG: 8,  fatG: 26,
    servingSize: '1 serving (200g)',
    tags: ['mutton', 'lamb', 'goat', 'curry', 'indian'], category: 'indian_main',
    gi: 15, fibreG: 0,
  },
  {
    emoji: '🐟', name: 'Fish Curry',       calories: 260, proteinG: 30, carbsG: 8,  fatG: 12,
    servingSize: '1 serving (200g)',
    tags: ['fish', 'curry', 'indian', 'seafood', 'masala'], category: 'indian_main',
    gi: 15, fibreG: 1,
  },

  // ─── Indian Mains — Rice Dishes ───────────────────────────────────────────
  {
    emoji: '🍚', name: 'Chicken Biryani',  calories: 520, proteinG: 30, carbsG: 62, fatG: 14,
    servingSize: '1 serving (350g)',
    tags: ['biryani', 'chicken', 'rice', 'indian', 'hyderabadi'], category: 'indian_main',
    gi: 58, fibreG: 1,
  },
  {
    emoji: '🍚', name: 'Veg Biryani',      calories: 380, proteinG: 9,  carbsG: 70, fatG: 8,
    servingSize: '1 serving (300g)',
    tags: ['biryani', 'vegetable', 'veg', 'rice', 'indian'], category: 'indian_main',
    gi: 55, fibreG: 2,
  },
  {
    emoji: '🍲', name: 'Khichdi',          calories: 280, proteinG: 12, carbsG: 48, fatG: 5,
    servingSize: '1 bowl (300g)',
    tags: ['khichdi', 'khichri', 'rice', 'dal', 'comfort', 'indian'], category: 'indian_main',
    gi: 39, fibreG: 4,
  },
  {
    emoji: '🍚', name: 'Basmati Rice',     calories: 200, proteinG: 4,  carbsG: 44, fatG: 0,
    servingSize: '1 cup cooked (186g)',
    tags: ['basmati', 'rice', 'white rice', 'indian'], category: 'carb',
    gi: 58, fibreG: 0,
  },
  {
    emoji: '🍚', name: 'Pulao',            calories: 260, proteinG: 5,  carbsG: 52, fatG: 4,
    servingSize: '1 cup (230g)',
    tags: ['pulao', 'pilaf', 'rice', 'indian'], category: 'indian_main',
    gi: 60, fibreG: 1,
  },

  // ─── Indian Bread ─────────────────────────────────────────────────────────
  {
    emoji: '🫓', name: 'Roti / Chapati',   calories: 100, proteinG: 3,  carbsG: 20, fatG: 1,
    servingSize: '1 medium (35g)',
    tags: ['roti', 'chapati', 'chapatti', 'bread', 'wheat', 'indian'], category: 'indian_bread',
    gi: 62, fibreG: 2,
  },
  {
    emoji: '🫓', name: 'Whole Wheat Roti', calories: 90,  proteinG: 3,  carbsG: 18, fatG: 1,
    servingSize: '1 medium (35g)',
    tags: ['roti', 'whole wheat', 'atta', 'bread', 'indian'], category: 'indian_bread',
    gi: 54, fibreG: 3,
  },
  {
    emoji: '🫓', name: 'Naan',             calories: 265, proteinG: 9,  carbsG: 45, fatG: 5,
    servingSize: '1 piece (90g)',
    tags: ['naan', 'bread', 'tandoor', 'indian'], category: 'indian_bread',
    gi: 71, fibreG: 1,
  },
  {
    emoji: '🫓', name: 'Butter Naan',      calories: 320, proteinG: 9,  carbsG: 45, fatG: 11,
    servingSize: '1 piece (90g)',
    tags: ['butter naan', 'naan', 'bread', 'indian'], category: 'indian_bread',
    gi: 71, fibreG: 1,
  },
  {
    emoji: '🫓', name: 'Plain Paratha',    calories: 180, proteinG: 4,  carbsG: 28, fatG: 6,
    servingSize: '1 medium (70g)',
    tags: ['paratha', 'parantha', 'bread', 'indian'], category: 'indian_bread',
    gi: 66, fibreG: 2,
  },
  {
    emoji: '🫓', name: 'Aloo Paratha',     calories: 260, proteinG: 6,  carbsG: 38, fatG: 10,
    servingSize: '1 medium (110g)',
    tags: ['aloo paratha', 'potato paratha', 'paratha', 'bread', 'punjabi', 'indian'], category: 'indian_bread',
    gi: 65, fibreG: 2,
  },
  {
    emoji: '🫓', name: 'Puri',             calories: 140, proteinG: 2,  carbsG: 18, fatG: 7,
    servingSize: '1 medium (40g)',
    tags: ['puri', 'poori', 'fried bread', 'indian'], category: 'indian_bread',
    gi: 70, fibreG: 1,
  },

  // ─── Indian Snacks & Breakfast ────────────────────────────────────────────
  {
    emoji: '🍱', name: 'Idli',             calories: 130, proteinG: 4,  carbsG: 27, fatG: 0,
    servingSize: '2 pieces (100g)',
    tags: ['idli', 'idly', 'south indian', 'rice', 'breakfast'], category: 'indian_snack',
    gi: 35, fibreG: 1,
  },
  {
    emoji: '🫔', name: 'Masala Dosa',      calories: 300, proteinG: 7,  carbsG: 48, fatG: 10,
    servingSize: '1 large dosa with filling',
    tags: ['masala dosa', 'dosa', 'south indian', 'breakfast', 'crepe'], category: 'indian_snack',
    gi: 48, fibreG: 2,
  },
  {
    emoji: '🫔', name: 'Plain Dosa',       calories: 170, proteinG: 4,  carbsG: 34, fatG: 2,
    servingSize: '1 dosa (80g)',
    tags: ['dosa', 'south indian', 'breakfast', 'crepe'], category: 'indian_snack',
    gi: 50, fibreG: 1,
  },
  {
    emoji: '🍜', name: 'Upma',             calories: 230, proteinG: 6,  carbsG: 35, fatG: 8,
    servingSize: '1 cup (200g)',
    tags: ['upma', 'semolina', 'rava', 'suji', 'south indian', 'breakfast'], category: 'indian_snack',
    gi: 55, fibreG: 2,
  },
  {
    emoji: '🍱', name: 'Poha',             calories: 250, proteinG: 5,  carbsG: 45, fatG: 6,
    servingSize: '1 cup (200g)',
    tags: ['poha', 'flattened rice', 'beaten rice', 'breakfast', 'indian'], category: 'indian_snack',
    gi: 64, fibreG: 1,
  },
  {
    emoji: '🍱', name: 'Dhokla',           calories: 200, proteinG: 8,  carbsG: 30, fatG: 6,
    servingSize: '4 pieces (120g)',
    tags: ['dhokla', 'gujarati', 'steamed', 'snack', 'indian'], category: 'indian_snack',
    gi: 35, fibreG: 2,
  },
  {
    emoji: '🥟', name: 'Samosa',           calories: 150, proteinG: 3,  carbsG: 20, fatG: 7,
    servingSize: '1 medium (60g)',
    tags: ['samosa', 'fried', 'snack', 'indian', 'street food'], category: 'indian_snack',
    gi: 68, fibreG: 2,
  },
  {
    emoji: '🥙', name: 'Vada',             calories: 160, proteinG: 5,  carbsG: 18, fatG: 8,
    servingSize: '1 medium (60g)',
    tags: ['vada', 'wada', 'south indian', 'fried', 'snack'], category: 'indian_snack',
    gi: 50, fibreG: 2,
  },

  // ─── Indian Dairy ─────────────────────────────────────────────────────────
  {
    emoji: '🧀', name: 'Paneer',           calories: 265, proteinG: 18, carbsG: 2,  fatG: 20,
    servingSize: '100g',
    tags: ['paneer', 'cottage cheese', 'dairy', 'indian', 'protein'], category: 'indian_dairy',
    gi: 14, fibreG: 0,
  },
  {
    emoji: '🥛', name: 'Curd / Dahi',      calories: 150, proteinG: 12, carbsG: 17, fatG: 4,
    servingSize: '1 cup (240g)',
    tags: ['curd', 'dahi', 'yogurt', 'yoghurt', 'indian', 'dairy'], category: 'indian_dairy',
    gi: 36, fibreG: 0,
  },
  {
    emoji: '🥛', name: 'Sweet Lassi',      calories: 210, proteinG: 9,  carbsG: 32, fatG: 5,
    servingSize: '1 glass (300ml)',
    tags: ['lassi', 'sweet', 'yogurt drink', 'indian', 'dairy'], category: 'indian_dairy',
    gi: 50, fibreG: 0,
  },
  {
    emoji: '🥛', name: 'Plain Lassi',      calories: 130, proteinG: 9,  carbsG: 15, fatG: 4,
    servingSize: '1 glass (250ml)',
    tags: ['lassi', 'plain', 'salted', 'yogurt drink', 'indian', 'dairy'], category: 'indian_dairy',
    gi: 36, fibreG: 0,
  },
  {
    emoji: '🥛', name: 'Chaas / Buttermilk', calories: 50, proteinG: 3, carbsG: 5,  fatG: 2,
    servingSize: '1 glass (250ml)',
    tags: ['chaas', 'buttermilk', 'low calorie', 'dairy', 'indian'], category: 'indian_dairy',
    gi: 32, fibreG: 0,
  },
  {
    emoji: '🫙', name: 'Ghee',             calories: 45,  proteinG: 0,  carbsG: 0,  fatG: 5,
    servingSize: '1 tsp (5g)',
    tags: ['ghee', 'clarified butter', 'fat', 'indian'], category: 'indian_dairy',
  },

  // ─── Indian Sweets (for logging awareness) ────────────────────────────────
  {
    emoji: '🍮', name: 'Gulab Jamun',      calories: 175, proteinG: 2,  carbsG: 28, fatG: 7,
    servingSize: '1 piece (50g)',
    tags: ['gulab jamun', 'sweet', 'mithai', 'dessert', 'indian'], category: 'indian_sweet',
    gi: 65, fibreG: 0,
  },
  {
    emoji: '🍡', name: 'Rasgulla',         calories: 100, proteinG: 2,  carbsG: 20, fatG: 2,
    servingSize: '1 piece (40g)',
    tags: ['rasgulla', 'rasgolla', 'sweet', 'bengali', 'dessert', 'indian'], category: 'indian_sweet',
    gi: 60, fibreG: 0,
  },
  {
    emoji: '🍚', name: 'Kheer',            calories: 200, proteinG: 5,  carbsG: 32, fatG: 7,
    servingSize: '1 cup (200g)',
    tags: ['kheer', 'rice pudding', 'sweet', 'dessert', 'indian'], category: 'indian_sweet',
    gi: 55, fibreG: 0,
  },

  // ─── Everyday Protein ─────────────────────────────────────────────────────
  {
    emoji: '🥚', name: 'Eggs (2 large)',   calories: 140, proteinG: 12, carbsG: 1,  fatG: 10,
    servingSize: '2 eggs (100g)',
    tags: ['eggs', 'egg', 'boiled', 'scrambled', 'omelette', 'protein'], category: 'protein',
    gi: 0, fibreG: 0,
  },
  {
    emoji: '🍳', name: 'Egg White (3)',    calories: 52,  proteinG: 11, carbsG: 1,  fatG: 0,
    servingSize: '3 egg whites (90g)',
    tags: ['egg white', 'egg', 'low fat', 'protein'], category: 'protein',
    gi: 0, fibreG: 0,
  },
  {
    emoji: '🍗', name: 'Chicken Breast',   calories: 248, proteinG: 46, carbsG: 0,  fatG: 5,
    servingSize: '150g cooked',
    tags: ['chicken', 'breast', 'lean', 'protein', 'grilled'], category: 'protein',
    gi: 0, fibreG: 0,
  },
  {
    emoji: '🐟', name: 'Tuna (canned)',    calories: 116, proteinG: 26, carbsG: 0,  fatG: 1,
    servingSize: '100g drained',
    tags: ['tuna', 'fish', 'canned', 'protein', 'lean'], category: 'protein',
    gi: 0, fibreG: 0,
  },
  {
    emoji: '🐟', name: 'Salmon',           calories: 280, proteinG: 34, carbsG: 0,  fatG: 15,
    servingSize: '150g fillet',
    tags: ['salmon', 'fish', 'omega 3', 'protein', 'fatty fish'], category: 'protein',
    gi: 0, fibreG: 0,
  },
  {
    emoji: '🥛', name: 'Greek Yogurt',     calories: 130, proteinG: 20, carbsG: 8,  fatG: 2,
    servingSize: '200g',
    tags: ['greek yogurt', 'yogurt', 'yoghurt', 'protein', 'dairy'], category: 'dairy',
    gi: 36, fibreG: 0,
  },
  {
    emoji: '🧀', name: 'Cottage Cheese',   calories: 98,  proteinG: 11, carbsG: 3,  fatG: 4,
    servingSize: '100g',
    tags: ['cottage cheese', 'low fat', 'protein', 'dairy'], category: 'dairy',
    gi: 10, fibreG: 0,
  },
  {
    emoji: '🥤', name: 'Protein Shake',    calories: 120, proteinG: 25, carbsG: 5,  fatG: 2,
    servingSize: '1 scoop (30g) + water',
    tags: ['protein shake', 'whey', 'supplement', 'protein powder'], category: 'supplement',
    gi: 20, fibreG: 1,
  },

  // ─── Everyday Carbs ───────────────────────────────────────────────────────
  {
    emoji: '🥣', name: 'Oats',             calories: 185, proteinG: 7,  carbsG: 32, fatG: 4,
    servingSize: '50g dry',
    tags: ['oats', 'oatmeal', 'porridge', 'breakfast', 'carb'], category: 'carb',
    gi: 55, fibreG: 4,
  },
  {
    emoji: '🍚', name: 'Brown Rice',       calories: 215, proteinG: 5,  carbsG: 45, fatG: 2,
    servingSize: '1 cup cooked (195g)',
    tags: ['brown rice', 'whole grain', 'rice', 'carb'], category: 'carb',
    gi: 50, fibreG: 2,
  },
  {
    emoji: '🍞', name: 'White Bread',      calories: 160, proteinG: 6,  carbsG: 30, fatG: 2,
    servingSize: '2 slices (60g)',
    tags: ['white bread', 'bread', 'toast', 'carb'], category: 'carb',
    gi: 75, fibreG: 1,
  },
  {
    emoji: '🍌', name: 'Banana',           calories: 105, proteinG: 1,  carbsG: 27, fatG: 0,
    servingSize: '1 medium (120g)',
    tags: ['banana', 'fruit', 'carb', 'potassium'], category: 'carb',
    gi: 51, fibreG: 3,
  },
  {
    emoji: '🍠', name: 'Sweet Potato',     calories: 112, proteinG: 2,  carbsG: 26, fatG: 0,
    servingSize: '1 medium (130g) baked',
    tags: ['sweet potato', 'yam', 'carb', 'vitamin a'], category: 'carb',
    gi: 44, fibreG: 4,
  },
  {
    emoji: '🌽', name: 'White Bread Toast',calories: 80,  proteinG: 3,  carbsG: 15, fatG: 1,
    servingSize: '1 slice (30g)',
    tags: ['toast', 'bread', 'slice', 'white bread', 'carb'], category: 'carb',
    gi: 75, fibreG: 1,
  },

  // ─── Fats & Veg ───────────────────────────────────────────────────────────
  {
    emoji: '🥑', name: 'Avocado',          calories: 160, proteinG: 2,  carbsG: 9,  fatG: 15,
    servingSize: '½ medium (75g)',
    tags: ['avocado', 'healthy fat', 'fat', 'guacamole'], category: 'fat',
    gi: 10, fibreG: 5,
  },
  {
    emoji: '🥜', name: 'Almonds',          calories: 170, proteinG: 6,  carbsG: 6,  fatG: 15,
    servingSize: '30g (approx 23 nuts)',
    tags: ['almonds', 'badam', 'nuts', 'fat', 'protein'], category: 'fat',
    gi: 15, fibreG: 3,
  },
  {
    emoji: '🥜', name: 'Peanut Butter',    calories: 190, proteinG: 8,  carbsG: 7,  fatG: 16,
    servingSize: '2 tbsp (32g)',
    tags: ['peanut butter', 'peanut', 'mungfali', 'fat', 'protein'], category: 'fat',
    gi: 14, fibreG: 2,
  },
  {
    emoji: '🥦', name: 'Broccoli',         calories: 55,  proteinG: 4,  carbsG: 11, fatG: 0,
    servingSize: '1 cup cooked (156g)',
    tags: ['broccoli', 'vegetable', 'veg', 'low calorie'], category: 'veg',
    gi: 15, fibreG: 4,
  },
  {
    emoji: '🌿', name: 'Spinach',          calories: 23,  proteinG: 3,  carbsG: 4,  fatG: 0,
    servingSize: '100g raw',
    tags: ['spinach', 'palak', 'greens', 'veg', 'iron'], category: 'veg',
    gi: 15, fibreG: 2,
  },

  // ─── More Everyday Vegetables ─────────────────────────────────────────────
  {
    emoji: '🥒', name: 'Cucumber',         calories: 16,  proteinG: 1,  carbsG: 3,  fatG: 0,
    servingSize: '½ medium (150g)',
    tags: ['cucumber', 'kheera', 'veg', 'low calorie', 'salad'], category: 'veg',
    gi: 15, fibreG: 1,
  },
  {
    emoji: '🫑', name: 'Red Bell Pepper',  calories: 37,  proteinG: 1,  carbsG: 9,  fatG: 0,
    servingSize: '1 medium (150g)',
    tags: ['bell pepper', 'capsicum', 'shimla mirch', 'red pepper', 'veg'], category: 'veg',
    gi: 15, fibreG: 3,
  },
  {
    emoji: '🍅', name: 'Tomato',           calories: 22,  proteinG: 1,  carbsG: 5,  fatG: 0,
    servingSize: '1 medium (123g)',
    tags: ['tomato', 'tamatar', 'veg', 'salad', 'low calorie'], category: 'veg',
    gi: 15, fibreG: 1,
  },
  {
    emoji: '🥕', name: 'Carrot',           calories: 41,  proteinG: 1,  carbsG: 10, fatG: 0,
    servingSize: '1 medium (80g)',
    tags: ['carrot', 'gajar', 'veg', 'beta-carotene'], category: 'veg',
    gi: 39, fibreG: 2,
  },
  {
    emoji: '🍄', name: 'Mushrooms',        calories: 22,  proteinG: 3,  carbsG: 3,  fatG: 0,
    servingSize: '1 cup cooked (156g)',
    tags: ['mushrooms', 'khumb', 'veg', 'low calorie', 'umami'], category: 'veg',
    gi: 15, fibreG: 1,
  },
  {
    emoji: '🥬', name: 'Kale',             calories: 43,  proteinG: 4,  carbsG: 7,  fatG: 1,
    servingSize: '1 cup cooked (130g)',
    tags: ['kale', 'greens', 'veg', 'superfood', 'vitamin k'], category: 'veg',
    gi: 15, fibreG: 3,
  },
  {
    emoji: '🥗', name: 'Courgette',        calories: 33,  proteinG: 2,  carbsG: 6,  fatG: 0,
    servingSize: '1 medium (200g)',
    tags: ['courgette', 'zucchini', 'veg', 'low calorie'], category: 'veg',
    gi: 15, fibreG: 2,
  },
  {
    emoji: '🫛', name: 'Peas',             calories: 62,  proteinG: 4,  carbsG: 11, fatG: 0,
    servingSize: '½ cup cooked (80g)',
    tags: ['peas', 'matar', 'green peas', 'veg', 'protein'], category: 'veg',
    gi: 48, fibreG: 4,
  },
  {
    emoji: '🌽', name: 'Sweetcorn',        calories: 88,  proteinG: 3,  carbsG: 19, fatG: 1,
    servingSize: '½ cup (82g)',
    tags: ['sweetcorn', 'corn', 'makai', 'veg', 'carb'], category: 'veg',
    gi: 52, fibreG: 2,
  },
  {
    emoji: '🥬', name: 'Edamame',          calories: 90,  proteinG: 9,  carbsG: 7,  fatG: 4,
    servingSize: '½ cup shelled (75g)',
    tags: ['edamame', 'soy beans', 'soybean', 'protein', 'veg'], category: 'veg',
    gi: 18, fibreG: 4,
  },

  // ─── Fruits ───────────────────────────────────────────────────────────────
  {
    emoji: '🍎', name: 'Apple',            calories: 95,  proteinG: 0,  carbsG: 25, fatG: 0,
    servingSize: '1 medium (182g)',
    tags: ['apple', 'seb', 'fruit', 'fibre'], category: 'fruit',
    gi: 36, fibreG: 4,
  },
  {
    emoji: '🍊', name: 'Orange',           calories: 62,  proteinG: 1,  carbsG: 15, fatG: 0,
    servingSize: '1 medium (131g)',
    tags: ['orange', 'narangi', 'citrus', 'fruit', 'vitamin c'], category: 'fruit',
    gi: 43, fibreG: 3,
  },
  {
    emoji: '🥭', name: 'Mango',            calories: 99,  proteinG: 1,  carbsG: 25, fatG: 1,
    servingSize: '1 cup sliced (165g)',
    tags: ['mango', 'aam', 'fruit', 'tropical'], category: 'fruit',
    gi: 51, fibreG: 3,
  },
  {
    emoji: '🍓', name: 'Strawberries',     calories: 49,  proteinG: 1,  carbsG: 12, fatG: 0,
    servingSize: '1 cup (150g)',
    tags: ['strawberry', 'strawberries', 'berries', 'fruit', 'low calorie'], category: 'fruit',
    gi: 40, fibreG: 3,
  },
  {
    emoji: '🫐', name: 'Blueberries',      calories: 84,  proteinG: 1,  carbsG: 21, fatG: 0,
    servingSize: '1 cup (148g)',
    tags: ['blueberries', 'berries', 'fruit', 'antioxidant'], category: 'fruit',
    gi: 53, fibreG: 4,
  },
  {
    emoji: '🍇', name: 'Grapes',           calories: 104, proteinG: 1,  carbsG: 27, fatG: 0,
    servingSize: '1 cup (150g)',
    tags: ['grapes', 'angur', 'fruit'], category: 'fruit',
    gi: 59, fibreG: 1,
  },
  {
    emoji: '🍉', name: 'Watermelon',       calories: 86,  proteinG: 2,  carbsG: 22, fatG: 0,
    servingSize: '2 cups cubed (280g)',
    tags: ['watermelon', 'tarbuz', 'fruit', 'low calorie', 'summer'], category: 'fruit',
    gi: 76, fibreG: 1,
  },
  {
    emoji: '🍐', name: 'Pear',             calories: 101, proteinG: 1,  carbsG: 27, fatG: 0,
    servingSize: '1 medium (178g)',
    tags: ['pear', 'nashpati', 'fruit', 'fibre'], category: 'fruit',
    gi: 38, fibreG: 5,
  },
  {
    emoji: '🥝', name: 'Kiwi',             calories: 90,  proteinG: 2,  carbsG: 22, fatG: 1,
    servingSize: '2 medium (148g)',
    tags: ['kiwi', 'kiwifruit', 'fruit', 'vitamin c'], category: 'fruit',
    gi: 39, fibreG: 4,
  },
  {
    emoji: '🍋', name: 'Lemon Juice',      calories: 11,  proteinG: 0,  carbsG: 3,  fatG: 0,
    servingSize: '1 lemon squeezed (50ml)',
    tags: ['lemon', 'nimbu', 'citrus', 'fruit', 'vitamin c', 'low calorie'], category: 'fruit',
    gi: 25, fibreG: 0,
  },

  // ─── UK Mains & Staples ───────────────────────────────────────────────────
  {
    emoji: '🥣', name: 'Porridge',         calories: 210, proteinG: 8,  carbsG: 34, fatG: 5,
    servingSize: '1 bowl (50g oats + 200ml semi-skimmed milk)',
    tags: ['porridge', 'oatmeal', 'oats', 'breakfast', 'uk', 'wholegrain'], category: 'uk_main',
    gi: 55, fibreG: 4,
  },
  {
    emoji: '🫘', name: 'Baked Beans',      calories: 175, proteinG: 10, carbsG: 32, fatG: 1,
    servingSize: '½ tin (200g)',
    tags: ['baked beans', 'beans', 'haricot', 'uk', 'high fibre', 'vegetarian'], category: 'uk_main',
    gi: 48, fibreG: 7,
  },
  {
    emoji: '🥔', name: 'Jacket Potato',    calories: 290, proteinG: 7,  carbsG: 64, fatG: 0,
    servingSize: '1 large (250g) plain',
    tags: ['jacket potato', 'baked potato', 'potato', 'carb', 'uk'], category: 'uk_main',
    gi: 85, fibreG: 4,
  },
  {
    emoji: '🐟', name: 'Fish & Chips',     calories: 840, proteinG: 35, carbsG: 90, fatG: 38,
    servingSize: '1 portion (400g)',
    tags: ['fish and chips', 'fish chips', 'cod', 'chips', 'uk', 'takeaway'], category: 'uk_main',
    gi: 75, fibreG: 4,
  },
  {
    emoji: '🍳', name: 'Full English Breakfast', calories: 650, proteinG: 38, carbsG: 40, fatG: 36,
    servingSize: '1 plate (2 eggs, 2 bacon, beans, toast, mushrooms)',
    tags: ['full english', 'fry up', 'english breakfast', 'uk', 'breakfast'], category: 'uk_main',
    gi: 55, fibreG: 5,
  },
  {
    emoji: '🍞', name: 'Cheese Sandwich',  calories: 380, proteinG: 19, carbsG: 40, fatG: 16,
    servingSize: '1 sandwich (2 slices bread + 40g cheddar)',
    tags: ['cheese sandwich', 'sandwich', 'cheddar', 'lunch', 'uk'], category: 'uk_main',
    gi: 65, fibreG: 2,
  },
  {
    emoji: '🍲', name: 'Lentil Soup',      calories: 170, proteinG: 10, carbsG: 28, fatG: 3,
    servingSize: '1 bowl (350ml)',
    tags: ['lentil soup', 'soup', 'masoor', 'dal soup', 'veg'], category: 'uk_main',
    gi: 29, fibreG: 8,
  },

  // ─── More Proteins ────────────────────────────────────────────────────────
  {
    emoji: '🍗', name: 'Chicken Thigh',    calories: 220, proteinG: 28, carbsG: 0,  fatG: 12,
    servingSize: '1 thigh (120g) cooked',
    tags: ['chicken thigh', 'chicken', 'protein', 'dark meat'], category: 'protein',
    gi: 0, fibreG: 0,
  },
  {
    emoji: '🦃', name: 'Turkey Breast',    calories: 190, proteinG: 40, carbsG: 0,  fatG: 3,
    servingSize: '150g cooked',
    tags: ['turkey', 'turkey breast', 'lean', 'protein', 'low fat'], category: 'protein',
    gi: 0, fibreG: 0,
  },
  {
    emoji: '🐟', name: 'Cod Fillet',       calories: 180, proteinG: 40, carbsG: 0,  fatG: 2,
    servingSize: '180g fillet',
    tags: ['cod', 'fish', 'white fish', 'lean', 'protein', 'uk'], category: 'protein',
    gi: 0, fibreG: 0,
  },
  {
    emoji: '🦐', name: 'King Prawns',      calories: 120, proteinG: 26, carbsG: 0,  fatG: 2,
    servingSize: '150g cooked',
    tags: ['prawns', 'shrimp', 'jhinga', 'seafood', 'protein', 'low fat'], category: 'protein',
    gi: 0, fibreG: 0,
  },
  {
    emoji: '🥗', name: 'Tofu (firm)',      calories: 140, proteinG: 15, carbsG: 3,  fatG: 8,
    servingSize: '150g',
    tags: ['tofu', 'soy', 'vegan', 'protein', 'vegetarian', 'plant-based'], category: 'protein',
    gi: 15, fibreG: 1,
  },
  {
    emoji: '🌱', name: 'Tempeh',           calories: 195, proteinG: 20, carbsG: 10, fatG: 10,
    servingSize: '100g',
    tags: ['tempeh', 'fermented soy', 'vegan', 'protein', 'plant-based', 'probiotic'], category: 'protein',
    gi: 25, fibreG: 7,
  },
  {
    emoji: '🐟', name: 'Sardines (canned)',calories: 190, proteinG: 23, carbsG: 0,  fatG: 11,
    servingSize: '100g drained',
    tags: ['sardines', 'canned fish', 'omega 3', 'calcium', 'protein'], category: 'protein',
    gi: 0, fibreG: 0,
  },
  {
    emoji: '🐟', name: 'Smoked Mackerel', calories: 295, proteinG: 20, carbsG: 0,  fatG: 24,
    servingSize: '100g fillet',
    tags: ['mackerel', 'smoked mackerel', 'fish', 'omega 3', 'fatty fish', 'uk'], category: 'protein',
    gi: 0, fibreG: 0,
  },
  {
    emoji: '🥩', name: 'Lean Beef Mince',  calories: 250, proteinG: 34, carbsG: 0,  fatG: 12,
    servingSize: '150g cooked (5% fat)',
    tags: ['beef mince', 'ground beef', 'beef', 'protein', 'lean'], category: 'protein',
    gi: 0, fibreG: 0,
  },
  {
    emoji: '🥩', name: 'Pork Loin',        calories: 200, proteinG: 35, carbsG: 0,  fatG: 6,
    servingSize: '150g cooked',
    tags: ['pork loin', 'pork', 'lean', 'protein'], category: 'protein',
    gi: 0, fibreG: 0,
  },
  {
    emoji: '🫛', name: 'Boiled Chickpeas', calories: 180, proteinG: 11, carbsG: 30, fatG: 3,
    servingSize: '1 cup cooked (164g)',
    tags: ['chickpeas', 'chana', 'garbanzo', 'legume', 'protein', 'fibre'], category: 'protein',
    gi: 28, fibreG: 9,
  },
  {
    emoji: '🫘', name: 'Black Beans',      calories: 170, proteinG: 11, carbsG: 31, fatG: 1,
    servingSize: '1 cup cooked (172g)',
    tags: ['black beans', 'beans', 'legume', 'protein', 'fibre', 'latin'], category: 'protein',
    gi: 30, fibreG: 10,
  },

  // ─── More Dairy ───────────────────────────────────────────────────────────
  {
    emoji: '🥛', name: 'Whole Milk',       calories: 149, proteinG: 8,  carbsG: 12, fatG: 8,
    servingSize: '1 cup (240ml)',
    tags: ['milk', 'whole milk', 'dairy', 'calcium'], category: 'dairy',
    gi: 27, fibreG: 0,
  },
  {
    emoji: '🥛', name: 'Semi-Skimmed Milk', calories: 100, proteinG: 7,  carbsG: 10, fatG: 3,
    servingSize: '1 cup (240ml)',
    tags: ['milk', 'semi-skimmed', 'low fat milk', 'dairy', 'calcium', 'uk'], category: 'dairy',
    gi: 27, fibreG: 0,
  },
  {
    emoji: '🥛', name: 'Skyr',             calories: 125, proteinG: 20, carbsG: 8,  fatG: 1,
    servingSize: '200g pot',
    tags: ['skyr', 'icelandic yogurt', 'high protein', 'dairy', 'low fat'], category: 'dairy',
    gi: 30, fibreG: 0,
  },
  {
    emoji: '🥛', name: 'Kefir',            calories: 110, proteinG: 9,  carbsG: 12, fatG: 3,
    servingSize: '1 cup (240ml)',
    tags: ['kefir', 'probiotic', 'fermented milk', 'dairy', 'gut health'], category: 'dairy',
    gi: 32, fibreG: 0,
  },
  {
    emoji: '🧀', name: 'Cheddar Cheese',   calories: 202, proteinG: 12, carbsG: 0,  fatG: 17,
    servingSize: '50g (2 slices)',
    tags: ['cheddar', 'cheese', 'dairy', 'calcium', 'uk'], category: 'dairy',
    gi: 0, fibreG: 0,
  },
  {
    emoji: '🧀', name: 'Mozzarella',       calories: 125, proteinG: 9,  carbsG: 1,  fatG: 10,
    servingSize: '50g',
    tags: ['mozzarella', 'cheese', 'dairy', 'pizza', 'italian'], category: 'dairy',
    gi: 0, fibreG: 0,
  },
  {
    emoji: '🧀', name: 'Feta Cheese',      calories: 99,  proteinG: 5,  carbsG: 1,  fatG: 8,
    servingSize: '40g',
    tags: ['feta', 'cheese', 'dairy', 'greek', 'salad'], category: 'dairy',
    gi: 0, fibreG: 0,
  },

  // ─── More Carbs ───────────────────────────────────────────────────────────
  {
    emoji: '🌾', name: 'Quinoa',           calories: 222, proteinG: 8,  carbsG: 39, fatG: 4,
    servingSize: '1 cup cooked (185g)',
    tags: ['quinoa', 'grain', 'complete protein', 'gluten-free', 'carb'], category: 'carb',
    gi: 53, fibreG: 5,
  },
  {
    emoji: '🍞', name: 'Wholegrain Bread', calories: 140, proteinG: 6,  carbsG: 24, fatG: 2,
    servingSize: '2 slices (60g)',
    tags: ['wholegrain', 'wholemeal', 'brown bread', 'bread', 'fibre', 'carb'], category: 'carb',
    gi: 51, fibreG: 4,
  },
  {
    emoji: '🍝', name: 'Pasta (cooked)',   calories: 220, proteinG: 8,  carbsG: 43, fatG: 1,
    servingSize: '1 cup cooked (140g)',
    tags: ['pasta', 'spaghetti', 'penne', 'carb', 'italian'], category: 'carb',
    gi: 49, fibreG: 2,
  },
  {
    emoji: '🥔', name: 'Boiled Potato',    calories: 130, proteinG: 3,  carbsG: 30, fatG: 0,
    servingSize: '1 medium (150g)',
    tags: ['potato', 'boiled potato', 'carb', 'aloo'], category: 'carb',
    gi: 78, fibreG: 2,
  },
  {
    emoji: '🌾', name: 'Couscous',         calories: 176, proteinG: 6,  carbsG: 36, fatG: 0,
    servingSize: '1 cup cooked (157g)',
    tags: ['couscous', 'grain', 'north african', 'carb'], category: 'carb',
    gi: 65, fibreG: 2,
  },
  {
    emoji: '🌾', name: 'Rice Cakes (plain)', calories: 70, proteinG: 2,  carbsG: 15, fatG: 0,
    servingSize: '2 cakes (18g)',
    tags: ['rice cake', 'rice cakes', 'snack', 'low calorie', 'gluten-free'], category: 'carb',
    gi: 82, fibreG: 0,
  },
  {
    emoji: '🥣', name: 'Granola',          calories: 250, proteinG: 6,  carbsG: 42, fatG: 8,
    servingSize: '60g serving',
    tags: ['granola', 'muesli', 'oats', 'breakfast', 'cereal'], category: 'carb',
    gi: 65, fibreG: 3,
  },
  {
    emoji: '🌽', name: 'Corn Tortilla',    calories: 120, proteinG: 3,  carbsG: 24, fatG: 1,
    servingSize: '2 small (50g)',
    tags: ['tortilla', 'corn tortilla', 'wrap', 'gluten-free', 'mexican'], category: 'carb',
    gi: 52, fibreG: 2,
  },

  // ─── Nuts & Seeds ─────────────────────────────────────────────────────────
  {
    emoji: '🥜', name: 'Walnuts',          calories: 186, proteinG: 4,  carbsG: 4,  fatG: 19,
    servingSize: '30g (7 halves)',
    tags: ['walnuts', 'akhrot', 'nuts', 'omega 3', 'brain health', 'fat'], category: 'nut_seed',
    gi: 15, fibreG: 2,
  },
  {
    emoji: '🥜', name: 'Cashews',          calories: 175, proteinG: 5,  carbsG: 10, fatG: 14,
    servingSize: '30g (about 18 nuts)',
    tags: ['cashews', 'kaju', 'nuts', 'fat', 'protein', 'magnesium'], category: 'nut_seed',
    gi: 22, fibreG: 1,
  },
  {
    emoji: '🌱', name: 'Chia Seeds',       calories: 138, proteinG: 5,  carbsG: 12, fatG: 9,
    servingSize: '30g (2 tbsp)',
    tags: ['chia seeds', 'seeds', 'omega 3', 'fibre', 'protein'], category: 'nut_seed',
    gi: 1, fibreG: 10,
  },
  {
    emoji: '🎃', name: 'Pumpkin Seeds',    calories: 170, proteinG: 9,  carbsG: 4,  fatG: 15,
    servingSize: '30g',
    tags: ['pumpkin seeds', 'pepitas', 'seeds', 'zinc', 'magnesium', 'protein'], category: 'nut_seed',
    gi: 10, fibreG: 1,
  },
  {
    emoji: '🌱', name: 'Flaxseed',         calories: 150, proteinG: 5,  carbsG: 8,  fatG: 12,
    servingSize: '30g (3 tbsp)',
    tags: ['flaxseed', 'linseed', 'alsi', 'omega 3', 'fibre', 'seeds'], category: 'nut_seed',
    gi: 35, fibreG: 8,
  },
  {
    emoji: '🥜', name: 'Brazil Nuts',      calories: 186, proteinG: 4,  carbsG: 4,  fatG: 19,
    servingSize: '30g (6 nuts)',
    tags: ['brazil nuts', 'nuts', 'selenium', 'fat'], category: 'nut_seed',
    gi: 15, fibreG: 2,
  },
  {
    emoji: '🌻', name: 'Sunflower Seeds',  calories: 165, proteinG: 6,  carbsG: 7,  fatG: 14,
    servingSize: '30g (3 tbsp)',
    tags: ['sunflower seeds', 'seeds', 'vitamin e', 'fat', 'protein'], category: 'nut_seed',
    gi: 35, fibreG: 2,
  },

  // ─── More Indian Mains ────────────────────────────────────────────────────
  {
    emoji: '🍛', name: 'Kadai Paneer',     calories: 310, proteinG: 14, carbsG: 16, fatG: 22,
    servingSize: '1 cup (250g)',
    tags: ['kadai', 'kadhai', 'paneer', 'curry', 'indian', 'wok'], category: 'indian_main',
    gi: 25, fibreG: 3,
  },
  {
    emoji: '🍛', name: 'Mutter Paneer',    calories: 290, proteinG: 13, carbsG: 18, fatG: 20,
    servingSize: '1 cup (250g)',
    tags: ['mutter', 'matar', 'paneer', 'peas', 'curry', 'indian'], category: 'indian_main',
    gi: 28, fibreG: 4,
  },
  {
    emoji: '🥬', name: 'Aloo Matar',       calories: 185, proteinG: 5,  carbsG: 30, fatG: 6,
    servingSize: '1 cup (220g)',
    tags: ['aloo', 'matar', 'potato', 'peas', 'sabzi', 'indian'], category: 'indian_main',
    gi: 60, fibreG: 4,
  },
  {
    emoji: '🍲', name: 'Rasam',            calories: 50,  proteinG: 2,  carbsG: 8,  fatG: 1,
    servingSize: '1 cup (240ml)',
    tags: ['rasam', 'tamarind', 'south indian', 'soup', 'low calorie'], category: 'indian_main',
    gi: 20, fibreG: 1,
  },
  {
    emoji: '🍚', name: 'Pongal',           calories: 280, proteinG: 10, carbsG: 46, fatG: 7,
    servingSize: '1 bowl (250g)',
    tags: ['pongal', 'ven pongal', 'south indian', 'breakfast', 'khichdi'], category: 'indian_main',
    gi: 45, fibreG: 4,
  },
  {
    emoji: '🍛', name: 'Pav Bhaji',        calories: 420, proteinG: 10, carbsG: 60, fatG: 16,
    servingSize: '1 serving (2 pav + 1 cup bhaji)',
    tags: ['pav bhaji', 'bhaji', 'pav', 'mumbai', 'street food', 'indian'], category: 'indian_main',
    gi: 60, fibreG: 5,
  },
  {
    emoji: '🍳', name: 'Uttapam',          calories: 220, proteinG: 6,  carbsG: 38, fatG: 6,
    servingSize: '1 large (120g)',
    tags: ['uttapam', 'uthappam', 'south indian', 'breakfast', 'toppings'], category: 'indian_snack',
    gi: 45, fibreG: 2,
  },

  // ─── Indian Bread (more) ──────────────────────────────────────────────────
  {
    emoji: '🫓', name: 'Methi Thepla',     calories: 140, proteinG: 5,  carbsG: 20, fatG: 5,
    servingSize: '1 medium (60g)',
    tags: ['thepla', 'methi', 'fenugreek', 'gujarati', 'indian', 'bread'], category: 'indian_bread',
    gi: 52, fibreG: 3,
  },
  {
    emoji: '🫓', name: 'Missi Roti',       calories: 130, proteinG: 6,  carbsG: 22, fatG: 3,
    servingSize: '1 medium (55g)',
    tags: ['missi roti', 'besan', 'gram flour', 'roti', 'bread', 'indian'], category: 'indian_bread',
    gi: 50, fibreG: 4,
  },

  // ─── Indian Snacks (more) ─────────────────────────────────────────────────
  {
    emoji: '🥙', name: 'Vada Pav',         calories: 310, proteinG: 7,  carbsG: 48, fatG: 11,
    servingSize: '1 serving (120g)',
    tags: ['vada pav', 'vada', 'pav', 'mumbai', 'street food', 'indian', 'snack'], category: 'indian_snack',
    gi: 68, fibreG: 3,
  },
  {
    emoji: '🥙', name: 'Pani Puri',        calories: 180, proteinG: 3,  carbsG: 30, fatG: 6,
    servingSize: '6 pieces (100g)',
    tags: ['pani puri', 'golgappa', 'puchka', 'street food', 'indian', 'snack'], category: 'indian_snack',
    gi: 70, fibreG: 2,
  },

  // ─── More Indian Sweets ───────────────────────────────────────────────────
  {
    emoji: '🍯', name: 'Besan Ladoo',      calories: 220, proteinG: 4,  carbsG: 28, fatG: 11,
    servingSize: '1 piece (50g)',
    tags: ['ladoo', 'besan ladoo', 'gram flour', 'sweet', 'mithai', 'indian'], category: 'indian_sweet',
    gi: 65, fibreG: 1,
  },
  {
    emoji: '🥕', name: 'Gajar Halwa',      calories: 280, proteinG: 5,  carbsG: 38, fatG: 12,
    servingSize: '1 cup (150g)',
    tags: ['gajar halwa', 'carrot halwa', 'halwa', 'sweet', 'dessert', 'indian'], category: 'indian_sweet',
    gi: 55, fibreG: 2,
  },
  {
    emoji: '🍬', name: 'Jalebi',           calories: 150, proteinG: 2,  carbsG: 28, fatG: 4,
    servingSize: '2 medium (60g)',
    tags: ['jalebi', 'sweet', 'mithai', 'dessert', 'fried', 'indian'], category: 'indian_sweet',
    gi: 75, fibreG: 0,
  },
  {
    emoji: '🍡', name: 'Barfi / Burfi',    calories: 200, proteinG: 4,  carbsG: 30, fatG: 8,
    servingSize: '1 piece (50g)',
    tags: ['barfi', 'burfi', 'sweet', 'mithai', 'milk sweet', 'indian', 'dessert'], category: 'indian_sweet',
    gi: 65, fibreG: 0,
  },

  // ─── Fat & Oils (more) ────────────────────────────────────────────────────
  {
    emoji: '🫒', name: 'Olive Oil',        calories: 119, proteinG: 0,  carbsG: 0,  fatG: 14,
    servingSize: '1 tbsp (14g)',
    tags: ['olive oil', 'evoo', 'oil', 'fat', 'mediterranean'], category: 'fat',
    gi: 0, fibreG: 0,
  },
  {
    emoji: '🥥', name: 'Coconut Oil',      calories: 130, proteinG: 0,  carbsG: 0,  fatG: 14,
    servingSize: '1 tbsp (14g)',
    tags: ['coconut oil', 'nariyal tel', 'oil', 'fat', 'mct'], category: 'fat',
    gi: 0, fibreG: 0,
  },
  {
    emoji: '🧈', name: 'Butter',           calories: 102, proteinG: 0,  carbsG: 0,  fatG: 12,
    servingSize: '1 tbsp (14g)',
    tags: ['butter', 'makhan', 'dairy fat', 'saturated fat'], category: 'fat',
    gi: 0, fibreG: 0,
  },
  {
    emoji: '🥜', name: 'Tahini',           calories: 178, proteinG: 5,  carbsG: 7,  fatG: 16,
    servingSize: '2 tbsp (30g)',
    tags: ['tahini', 'sesame paste', 'sesame', 'fat', 'calcium'], category: 'fat',
    gi: 35, fibreG: 1,
  },
  {
    emoji: '🥙', name: 'Hummus',           calories: 166, proteinG: 8,  carbsG: 18, fatG: 8,
    servingSize: '4 tbsp (100g)',
    tags: ['hummus', 'chickpea', 'chana', 'dip', 'middle eastern', 'fat', 'protein'], category: 'fat',
    gi: 28, fibreG: 6,
  },

  // ─── More Supplements ─────────────────────────────────────────────────────
  {
    emoji: '💊', name: 'Creatine Monohydrate', calories: 0, proteinG: 0, carbsG: 0, fatG: 0,
    servingSize: '5g (1 tsp)',
    tags: ['creatine', 'supplement', 'muscle', 'performance', 'monohydrate'], category: 'supplement',
    gi: 0,
  },
  {
    emoji: '💊', name: 'BCAA',             calories: 20,  proteinG: 5,  carbsG: 0,  fatG: 0,
    servingSize: '1 scoop (10g)',
    tags: ['bcaa', 'amino acid', 'supplement', 'muscle recovery', 'leucine'], category: 'supplement',
    gi: 0,
  },
  {
    emoji: '🥤', name: 'Mass Gainer',      calories: 400, proteinG: 30, carbsG: 70, fatG: 5,
    servingSize: '1 scoop (100g) + water',
    tags: ['mass gainer', 'weight gainer', 'bulking', 'supplement', 'protein shake'], category: 'supplement',
    gi: 60, fibreG: 2,
  },
]

// Lower-GI swap suggestions for high-GI foods (GI > 60)
export const LOWER_GI_SWAPS: Record<string, string> = {
  'Naan': 'Whole Wheat Roti (GI 54)',
  'Butter Naan': 'Whole Wheat Roti (GI 54)',
  'White Bread': 'Oats (GI 55) or Whole Wheat Roti',
  'White Bread Toast': 'Wholegrain Bread (GI 51) or Oats',
  'Puri': 'Whole Wheat Roti (GI 54)',
  'Roti / Chapati': 'Whole Wheat Roti (GI 54)',
  'Plain Paratha': 'Whole Wheat Roti (GI 54)',
  'Aloo Paratha': 'Moong Dal Cheela (GI 35)',
  'Poha': 'Idli (GI 35) or Upma (GI 55)',
  'Samosa': 'Dhokla (GI 35)',
  'Chole Bhature': 'Chana Masala with Whole Wheat Roti',
  'Gulab Jamun': 'Rasgulla (GI 60) — smaller portion',
  'Basmati Rice': 'Brown Rice (GI 50) or Khichdi (GI 39)',
  'Pulao': 'Khichdi (GI 39)',
  'Jacket Potato': 'Sweet Potato (GI 44) or Boiled Potato (smaller portion)',
  'Boiled Potato': 'Sweet Potato (GI 44)',
  'Rice Cakes (plain)': 'Oats (GI 55) or Wholegrain Bread',
  'Granola': 'Oats / Porridge (GI 55)',
  'Watermelon': 'Strawberries (GI 40) or Blueberries (GI 53)',
  'Jalebi': 'Gulab Jamun (GI 65) — smaller portion',
  'Vada Pav': 'Dhokla (GI 35) or Moong Dal Cheela',
  'Pani Puri': 'Dhokla (GI 35)',
  'Pav Bhaji': 'Chana Masala with Whole Wheat Roti',
  'Couscous': 'Quinoa (GI 53) or Brown Rice (GI 50)',
}
