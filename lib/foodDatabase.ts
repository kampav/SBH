// ─── SBH Food Database ────────────────────────────────────────────────────────
// Curated list of ~75 Indian + everyday foods with accurate macro estimates.
// Used for instant client-side search on the Nutrition page.

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
}

export const FOOD_DATABASE: FoodEntry[] = [
  // ─── Indian Mains — Dal & Lentils ─────────────────────────────────────────
  {
    emoji: '🫘', name: 'Toor Dal',         calories: 230, proteinG: 18, carbsG: 40, fatG: 1,
    servingSize: '1 cup cooked (240g)',
    tags: ['toor', 'arhar', 'dal', 'lentil', 'indian'], category: 'indian_main',
  },
  {
    emoji: '🫘', name: 'Chana Dal',        calories: 269, proteinG: 14, carbsG: 45, fatG: 4,
    servingSize: '1 cup cooked (240g)',
    tags: ['chana', 'dal', 'lentil', 'indian', 'chickpea'], category: 'indian_main',
  },
  {
    emoji: '🫘', name: 'Moong Dal',        calories: 212, proteinG: 14, carbsG: 38, fatG: 1,
    servingSize: '1 cup cooked (240g)',
    tags: ['moong', 'mung', 'dal', 'lentil', 'indian'], category: 'indian_main',
  },
  {
    emoji: '🫘', name: 'Dal Makhani',      calories: 320, proteinG: 13, carbsG: 38, fatG: 13,
    servingSize: '1 cup (250g)',
    tags: ['dal', 'makhani', 'black dal', 'urad', 'indian', 'punjabi'], category: 'indian_main',
  },
  {
    emoji: '🫘', name: 'Dal Tadka',        calories: 200, proteinG: 12, carbsG: 30, fatG: 6,
    servingSize: '1 cup (240g)',
    tags: ['dal', 'tadka', 'tarka', 'indian', 'lentil'], category: 'indian_main',
  },
  {
    emoji: '🫘', name: 'Moong Dal Cheela', calories: 150, proteinG: 10, carbsG: 22, fatG: 4,
    servingSize: '2 pieces (120g)',
    tags: ['cheela', 'chilla', 'moong', 'pancake', 'breakfast', 'indian'], category: 'indian_snack',
  },

  // ─── Indian Mains — Legumes ────────────────────────────────────────────────
  {
    emoji: '🫘', name: 'Rajma',            calories: 225, proteinG: 15, carbsG: 40, fatG: 1,
    servingSize: '1 cup cooked (240g)',
    tags: ['rajma', 'kidney beans', 'dal', 'indian', 'punjabi'], category: 'indian_main',
  },
  {
    emoji: '🫘', name: 'Chana Masala',     calories: 270, proteinG: 12, carbsG: 42, fatG: 7,
    servingSize: '1 cup (250g)',
    tags: ['chana', 'chickpea', 'chole', 'masala', 'indian'], category: 'indian_main',
  },
  {
    emoji: '🫘', name: 'Chole Bhature',    calories: 520, proteinG: 14, carbsG: 72, fatG: 20,
    servingSize: '1 serving (1 bhatura + ½ cup chole)',
    tags: ['chole', 'bhature', 'chana', 'punjabi', 'indian'], category: 'indian_main',
  },

  // ─── Indian Mains — Vegetable Curries ─────────────────────────────────────
  {
    emoji: '🧀', name: 'Palak Paneer',     calories: 280, proteinG: 12, carbsG: 14, fatG: 20,
    servingSize: '1 cup (250g)',
    tags: ['palak', 'paneer', 'spinach', 'curry', 'indian'], category: 'indian_main',
  },
  {
    emoji: '🧀', name: 'Shahi Paneer',     calories: 340, proteinG: 14, carbsG: 18, fatG: 24,
    servingSize: '1 cup (250g)',
    tags: ['shahi', 'paneer', 'curry', 'indian', 'rich'], category: 'indian_main',
  },
  {
    emoji: '🥬', name: 'Aloo Gobi',        calories: 150, proteinG: 4,  carbsG: 24, fatG: 5,
    servingSize: '1 cup (200g)',
    tags: ['aloo', 'gobi', 'potato', 'cauliflower', 'sabzi', 'indian'], category: 'indian_main',
  },
  {
    emoji: '🍆', name: 'Baingan Bharta',   calories: 130, proteinG: 3,  carbsG: 16, fatG: 6,
    servingSize: '1 cup (200g)',
    tags: ['baingan', 'bharta', 'aubergine', 'eggplant', 'indian'], category: 'indian_main',
  },
  {
    emoji: '🌿', name: 'Bhindi Masala',    calories: 120, proteinG: 3,  carbsG: 15, fatG: 5,
    servingSize: '1 cup (200g)',
    tags: ['bhindi', 'okra', 'ladies finger', 'sabzi', 'indian'], category: 'indian_main',
  },
  {
    emoji: '🥬', name: 'Saag',             calories: 160, proteinG: 5,  carbsG: 14, fatG: 9,
    servingSize: '1 cup (220g)',
    tags: ['saag', 'sarson', 'mustard', 'greens', 'punjabi', 'indian'], category: 'indian_main',
  },
  {
    emoji: '🍲', name: 'Sambar',           calories: 130, proteinG: 7,  carbsG: 20, fatG: 3,
    servingSize: '1 cup (240g)',
    tags: ['sambar', 'south indian', 'dal', 'lentil', 'tamarind'], category: 'indian_main',
  },

  // ─── Indian Mains — Meat & Poultry ────────────────────────────────────────
  {
    emoji: '🍗', name: 'Chicken Curry',    calories: 340, proteinG: 32, carbsG: 10, fatG: 18,
    servingSize: '1 serving (200g)',
    tags: ['chicken', 'curry', 'masala', 'indian'], category: 'indian_main',
  },
  {
    emoji: '🍗', name: 'Chicken Tikka',    calories: 225, proteinG: 32, carbsG: 4,  fatG: 9,
    servingSize: '150g (6–8 pieces)',
    tags: ['chicken', 'tikka', 'tandoor', 'indian', 'bbq', 'grill'], category: 'indian_main',
  },
  {
    emoji: '🍗', name: 'Tandoori Chicken', calories: 240, proteinG: 38, carbsG: 6,  fatG: 7,
    servingSize: '½ chicken (200g)',
    tags: ['tandoori', 'chicken', 'tandoor', 'grill', 'indian'], category: 'indian_main',
  },
  {
    emoji: '🍗', name: 'Butter Chicken',   calories: 370, proteinG: 28, carbsG: 16, fatG: 22,
    servingSize: '1 cup (250g)',
    tags: ['butter chicken', 'murgh makhani', 'makhani', 'indian', 'punjabi'], category: 'indian_main',
  },
  {
    emoji: '🥚', name: 'Egg Curry',        calories: 220, proteinG: 14, carbsG: 8,  fatG: 15,
    servingSize: '2 eggs with gravy',
    tags: ['egg', 'anda', 'curry', 'masala', 'indian'], category: 'indian_main',
  },
  {
    emoji: '🐑', name: 'Mutton Curry',     calories: 380, proteinG: 28, carbsG: 8,  fatG: 26,
    servingSize: '1 serving (200g)',
    tags: ['mutton', 'lamb', 'goat', 'curry', 'indian'], category: 'indian_main',
  },
  {
    emoji: '🐟', name: 'Fish Curry',       calories: 260, proteinG: 30, carbsG: 8,  fatG: 12,
    servingSize: '1 serving (200g)',
    tags: ['fish', 'curry', 'indian', 'seafood', 'masala'], category: 'indian_main',
  },

  // ─── Indian Mains — Rice Dishes ───────────────────────────────────────────
  {
    emoji: '🍚', name: 'Chicken Biryani',  calories: 520, proteinG: 30, carbsG: 62, fatG: 14,
    servingSize: '1 serving (350g)',
    tags: ['biryani', 'chicken', 'rice', 'indian', 'hyderabadi'], category: 'indian_main',
  },
  {
    emoji: '🍚', name: 'Veg Biryani',      calories: 380, proteinG: 9,  carbsG: 70, fatG: 8,
    servingSize: '1 serving (300g)',
    tags: ['biryani', 'vegetable', 'veg', 'rice', 'indian'], category: 'indian_main',
  },
  {
    emoji: '🍲', name: 'Khichdi',          calories: 280, proteinG: 12, carbsG: 48, fatG: 5,
    servingSize: '1 bowl (300g)',
    tags: ['khichdi', 'khichri', 'rice', 'dal', 'comfort', 'indian'], category: 'indian_main',
  },
  {
    emoji: '🍚', name: 'Basmati Rice',     calories: 200, proteinG: 4,  carbsG: 44, fatG: 0,
    servingSize: '1 cup cooked (186g)',
    tags: ['basmati', 'rice', 'white rice', 'indian'], category: 'carb',
  },
  {
    emoji: '🍚', name: 'Pulao',            calories: 260, proteinG: 5,  carbsG: 52, fatG: 4,
    servingSize: '1 cup (230g)',
    tags: ['pulao', 'pilaf', 'rice', 'indian'], category: 'indian_main',
  },

  // ─── Indian Bread ─────────────────────────────────────────────────────────
  {
    emoji: '🫓', name: 'Roti / Chapati',   calories: 100, proteinG: 3,  carbsG: 20, fatG: 1,
    servingSize: '1 medium (35g)',
    tags: ['roti', 'chapati', 'chapatti', 'bread', 'wheat', 'indian'], category: 'indian_bread',
  },
  {
    emoji: '🫓', name: 'Whole Wheat Roti', calories: 90,  proteinG: 3,  carbsG: 18, fatG: 1,
    servingSize: '1 medium (35g)',
    tags: ['roti', 'whole wheat', 'atta', 'bread', 'indian'], category: 'indian_bread',
  },
  {
    emoji: '🫓', name: 'Naan',             calories: 265, proteinG: 9,  carbsG: 45, fatG: 5,
    servingSize: '1 piece (90g)',
    tags: ['naan', 'bread', 'tandoor', 'indian'], category: 'indian_bread',
  },
  {
    emoji: '🫓', name: 'Butter Naan',      calories: 320, proteinG: 9,  carbsG: 45, fatG: 11,
    servingSize: '1 piece (90g)',
    tags: ['butter naan', 'naan', 'bread', 'indian'], category: 'indian_bread',
  },
  {
    emoji: '🫓', name: 'Plain Paratha',    calories: 180, proteinG: 4,  carbsG: 28, fatG: 6,
    servingSize: '1 medium (70g)',
    tags: ['paratha', 'parantha', 'bread', 'indian'], category: 'indian_bread',
  },
  {
    emoji: '🫓', name: 'Aloo Paratha',     calories: 260, proteinG: 6,  carbsG: 38, fatG: 10,
    servingSize: '1 medium (110g)',
    tags: ['aloo paratha', 'potato paratha', 'paratha', 'bread', 'punjabi', 'indian'], category: 'indian_bread',
  },
  {
    emoji: '🫓', name: 'Puri',             calories: 140, proteinG: 2,  carbsG: 18, fatG: 7,
    servingSize: '1 medium (40g)',
    tags: ['puri', 'poori', 'fried bread', 'indian'], category: 'indian_bread',
  },

  // ─── Indian Snacks & Breakfast ────────────────────────────────────────────
  {
    emoji: '🍱', name: 'Idli',             calories: 130, proteinG: 4,  carbsG: 27, fatG: 0,
    servingSize: '2 pieces (100g)',
    tags: ['idli', 'idly', 'south indian', 'rice', 'breakfast'], category: 'indian_snack',
  },
  {
    emoji: '🫔', name: 'Masala Dosa',      calories: 300, proteinG: 7,  carbsG: 48, fatG: 10,
    servingSize: '1 large dosa with filling',
    tags: ['masala dosa', 'dosa', 'south indian', 'breakfast', 'crepe'], category: 'indian_snack',
  },
  {
    emoji: '🫔', name: 'Plain Dosa',       calories: 170, proteinG: 4,  carbsG: 34, fatG: 2,
    servingSize: '1 dosa (80g)',
    tags: ['dosa', 'south indian', 'breakfast', 'crepe'], category: 'indian_snack',
  },
  {
    emoji: '🍜', name: 'Upma',             calories: 230, proteinG: 6,  carbsG: 35, fatG: 8,
    servingSize: '1 cup (200g)',
    tags: ['upma', 'semolina', 'rava', 'suji', 'south indian', 'breakfast'], category: 'indian_snack',
  },
  {
    emoji: '🍱', name: 'Poha',             calories: 250, proteinG: 5,  carbsG: 45, fatG: 6,
    servingSize: '1 cup (200g)',
    tags: ['poha', 'flattened rice', 'beaten rice', 'breakfast', 'indian'], category: 'indian_snack',
  },
  {
    emoji: '🍱', name: 'Dhokla',           calories: 200, proteinG: 8,  carbsG: 30, fatG: 6,
    servingSize: '4 pieces (120g)',
    tags: ['dhokla', 'gujarati', 'steamed', 'snack', 'indian'], category: 'indian_snack',
  },
  {
    emoji: '🥟', name: 'Samosa',           calories: 150, proteinG: 3,  carbsG: 20, fatG: 7,
    servingSize: '1 medium (60g)',
    tags: ['samosa', 'fried', 'snack', 'indian', 'street food'], category: 'indian_snack',
  },
  {
    emoji: '🥙', name: 'Vada',             calories: 160, proteinG: 5,  carbsG: 18, fatG: 8,
    servingSize: '1 medium (60g)',
    tags: ['vada', 'wada', 'south indian', 'fried', 'snack'], category: 'indian_snack',
  },

  // ─── Indian Dairy ─────────────────────────────────────────────────────────
  {
    emoji: '🧀', name: 'Paneer',           calories: 265, proteinG: 18, carbsG: 2,  fatG: 20,
    servingSize: '100g',
    tags: ['paneer', 'cottage cheese', 'dairy', 'indian', 'protein'], category: 'indian_dairy',
  },
  {
    emoji: '🥛', name: 'Curd / Dahi',      calories: 150, proteinG: 12, carbsG: 17, fatG: 4,
    servingSize: '1 cup (240g)',
    tags: ['curd', 'dahi', 'yogurt', 'yoghurt', 'indian', 'dairy'], category: 'indian_dairy',
  },
  {
    emoji: '🥛', name: 'Sweet Lassi',      calories: 210, proteinG: 9,  carbsG: 32, fatG: 5,
    servingSize: '1 glass (300ml)',
    tags: ['lassi', 'sweet', 'yogurt drink', 'indian', 'dairy'], category: 'indian_dairy',
  },
  {
    emoji: '🥛', name: 'Plain Lassi',      calories: 130, proteinG: 9,  carbsG: 15, fatG: 4,
    servingSize: '1 glass (250ml)',
    tags: ['lassi', 'plain', 'salted', 'yogurt drink', 'indian', 'dairy'], category: 'indian_dairy',
  },
  {
    emoji: '🥛', name: 'Chaas / Buttermilk', calories: 50, proteinG: 3, carbsG: 5,  fatG: 2,
    servingSize: '1 glass (250ml)',
    tags: ['chaas', 'buttermilk', 'low calorie', 'dairy', 'indian'], category: 'indian_dairy',
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
  },
  {
    emoji: '🍡', name: 'Rasgulla',         calories: 100, proteinG: 2,  carbsG: 20, fatG: 2,
    servingSize: '1 piece (40g)',
    tags: ['rasgulla', 'rasgolla', 'sweet', 'bengali', 'dessert', 'indian'], category: 'indian_sweet',
  },
  {
    emoji: '🍚', name: 'Kheer',            calories: 200, proteinG: 5,  carbsG: 32, fatG: 7,
    servingSize: '1 cup (200g)',
    tags: ['kheer', 'rice pudding', 'sweet', 'dessert', 'indian'], category: 'indian_sweet',
  },

  // ─── Everyday Protein ─────────────────────────────────────────────────────
  {
    emoji: '🥚', name: 'Eggs (2 large)',   calories: 140, proteinG: 12, carbsG: 1,  fatG: 10,
    servingSize: '2 eggs (100g)',
    tags: ['eggs', 'egg', 'boiled', 'scrambled', 'omelette', 'protein'], category: 'protein',
  },
  {
    emoji: '🍳', name: 'Egg White (3)',    calories: 52,  proteinG: 11, carbsG: 1,  fatG: 0,
    servingSize: '3 egg whites (90g)',
    tags: ['egg white', 'egg', 'low fat', 'protein'], category: 'protein',
  },
  {
    emoji: '🍗', name: 'Chicken Breast',   calories: 248, proteinG: 46, carbsG: 0,  fatG: 5,
    servingSize: '150g cooked',
    tags: ['chicken', 'breast', 'lean', 'protein', 'grilled'], category: 'protein',
  },
  {
    emoji: '🐟', name: 'Tuna (canned)',    calories: 116, proteinG: 26, carbsG: 0,  fatG: 1,
    servingSize: '100g drained',
    tags: ['tuna', 'fish', 'canned', 'protein', 'lean'], category: 'protein',
  },
  {
    emoji: '🐟', name: 'Salmon',           calories: 280, proteinG: 34, carbsG: 0,  fatG: 15,
    servingSize: '150g fillet',
    tags: ['salmon', 'fish', 'omega 3', 'protein', 'fatty fish'], category: 'protein',
  },
  {
    emoji: '🥛', name: 'Greek Yogurt',     calories: 130, proteinG: 20, carbsG: 8,  fatG: 2,
    servingSize: '200g',
    tags: ['greek yogurt', 'yogurt', 'yoghurt', 'protein', 'dairy'], category: 'dairy',
  },
  {
    emoji: '🧀', name: 'Cottage Cheese',   calories: 98,  proteinG: 11, carbsG: 3,  fatG: 4,
    servingSize: '100g',
    tags: ['cottage cheese', 'low fat', 'protein', 'dairy'], category: 'dairy',
  },
  {
    emoji: '🥤', name: 'Protein Shake',    calories: 120, proteinG: 25, carbsG: 5,  fatG: 2,
    servingSize: '1 scoop (30g) + water',
    tags: ['protein shake', 'whey', 'supplement', 'protein powder'], category: 'supplement',
  },

  // ─── Everyday Carbs ───────────────────────────────────────────────────────
  {
    emoji: '🥣', name: 'Oats',             calories: 185, proteinG: 7,  carbsG: 32, fatG: 4,
    servingSize: '50g dry',
    tags: ['oats', 'oatmeal', 'porridge', 'breakfast', 'carb'], category: 'carb',
  },
  {
    emoji: '🍚', name: 'Brown Rice',       calories: 215, proteinG: 5,  carbsG: 45, fatG: 2,
    servingSize: '1 cup cooked (195g)',
    tags: ['brown rice', 'whole grain', 'rice', 'carb'], category: 'carb',
  },
  {
    emoji: '🍞', name: 'White Bread',      calories: 160, proteinG: 6,  carbsG: 30, fatG: 2,
    servingSize: '2 slices (60g)',
    tags: ['white bread', 'bread', 'toast', 'carb'], category: 'carb',
  },
  {
    emoji: '🍌', name: 'Banana',           calories: 105, proteinG: 1,  carbsG: 27, fatG: 0,
    servingSize: '1 medium (120g)',
    tags: ['banana', 'fruit', 'carb', 'potassium'], category: 'carb',
  },
  {
    emoji: '🍠', name: 'Sweet Potato',     calories: 112, proteinG: 2,  carbsG: 26, fatG: 0,
    servingSize: '1 medium (130g) baked',
    tags: ['sweet potato', 'yam', 'carb', 'vitamin a'], category: 'carb',
  },
  {
    emoji: '🌽', name: 'White Bread Toast',calories: 80,  proteinG: 3,  carbsG: 15, fatG: 1,
    servingSize: '1 slice (30g)',
    tags: ['toast', 'bread', 'slice', 'white bread', 'carb'], category: 'carb',
  },

  // ─── Fats & Veg ───────────────────────────────────────────────────────────
  {
    emoji: '🥑', name: 'Avocado',          calories: 160, proteinG: 2,  carbsG: 9,  fatG: 15,
    servingSize: '½ medium (75g)',
    tags: ['avocado', 'healthy fat', 'fat', 'guacamole'], category: 'fat',
  },
  {
    emoji: '🥜', name: 'Almonds',          calories: 170, proteinG: 6,  carbsG: 6,  fatG: 15,
    servingSize: '30g (approx 23 nuts)',
    tags: ['almonds', 'badam', 'nuts', 'fat', 'protein'], category: 'fat',
  },
  {
    emoji: '🥜', name: 'Peanut Butter',    calories: 190, proteinG: 8,  carbsG: 7,  fatG: 16,
    servingSize: '2 tbsp (32g)',
    tags: ['peanut butter', 'peanut', 'mungfali', 'fat', 'protein'], category: 'fat',
  },
  {
    emoji: '🥦', name: 'Broccoli',         calories: 55,  proteinG: 4,  carbsG: 11, fatG: 0,
    servingSize: '1 cup cooked (156g)',
    tags: ['broccoli', 'vegetable', 'veg', 'low calorie'], category: 'veg',
  },
  {
    emoji: '🌿', name: 'Spinach',          calories: 23,  proteinG: 3,  carbsG: 4,  fatG: 0,
    servingSize: '100g raw',
    tags: ['spinach', 'palak', 'greens', 'veg', 'iron'], category: 'veg',
  },
]
