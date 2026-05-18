import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Категории
const CATEGORIES = [
  { slug: 'fastfood',      name: 'Фастфуд',         sortOrder: 1 },
  { slug: 'pizza',         name: 'Пицца',            sortOrder: 2 },
  { slug: 'shashlik',      name: 'Шашлык',           sortOrder: 3 },
  { slug: 'main-courses',  name: 'Горячие блюда',    sortOrder: 4 },
  { slug: 'soups',         name: 'Супы',             sortOrder: 5 },
  { slug: 'salads',        name: 'Салаты',           sortOrder: 6 },
  { slug: 'kutabs',        name: 'Кутабы',           sortOrder: 7 },
  { slug: 'breakfast',     name: 'Завтраки',         sortOrder: 8 },
  { slug: 'fries',         name: 'Картофель фри',   sortOrder: 9 },
  { slug: 'sauces',        name: 'Соусы',            sortOrder: 10 },
  { slug: 'seasonal',      name: 'Сезонное',         sortOrder: 11 },
  { slug: 'hot-drinks',    name: 'Напитки',          sortOrder: 12 },
];

// Все блюда (скопировано из lib/data/products/)
const PRODUCTS = [
  // fastfood
  { id: 1,  name: 'Бургер классический', price: 350, description: 'Сочный бургер с говяжьей котлетой', category: 'fastfood', image: '/images/products/fastfood/burger-classic.jpg', weight: 300, unit: 'г' },
  { id: 2,  name: 'Бургер двойной', price: 450, description: 'Двойная говяжья котлета', category: 'fastfood', image: '/images/products/fastfood/burger-double.jpg', weight: 400, unit: 'г' },
  { id: 3,  name: 'Хот-дог', price: 200, description: 'Классический хот-дог с сосиской', category: 'fastfood', image: '/images/products/fastfood/hotdog.jpg', weight: 200, unit: 'г' },
  { id: 4,  name: 'Шаурма куриная', price: 300, description: 'Шаурма с курицей и овощами', category: 'fastfood', image: '/images/products/fastfood/shawarma-chicken.jpg', weight: 350, unit: 'г' },
  { id: 5,  name: 'Шаурма говяжья', price: 350, description: 'Шаурма с говядиной и овощами', category: 'fastfood', image: '/images/products/fastfood/shawarma-beef.jpg', weight: 380, unit: 'г' },

  // pizza
  { id: 44, name: 'Пицца Куриная', price: 700, description: 'Пицца с курицей и овощами', category: 'pizza', image: '/images/products/pizza/pizza-kurinay.jpg.jpeg' },
  { id: 45, name: 'Пицца Грибная', price: 700, description: 'Пицца с грибами и сыром', category: 'pizza', image: '/images/products/pizza/pizza-gribnay.jpg.jpeg' },
  { id: 46, name: 'Пицца Маргарита', price: 700, description: 'Классическая пицца Маргарита', category: 'pizza', image: '/images/products/pizza/pizza-margarita.jpg.jpeg' },
  { id: 47, name: 'Пицца Четыре сыра', price: 700, description: 'Пицца с четырьмя видами сыра', category: 'pizza', image: '/images/products/pizza/pizza-4sura.jpeg' },
  { id: 48, name: 'Пицца Пепперони', price: 700, description: 'Острая пицца с пепперони', category: 'pizza', image: '/images/products/pizza/pizza-peperoni.jpg.jpeg' },
  { id: 49, name: 'Пицца с морепродуктами', price: 850, description: 'Пицца с морепродуктами', category: 'pizza', image: '/images/products/pizza/pizza-more-product.jpg.jpeg' },
  { id: 50, name: 'Хачапури по-азербайджански', price: 500, description: 'Традиционное азербайджанское хачапури', category: 'pizza', image: '/images/products/pizza/chahapuri.jpg.jpeg' },
  { id: 51, name: 'Хачапури по-мегрельски', price: 550, description: 'Мегрельское хачапури с сыром', category: 'pizza', image: '/images/products/pizza/chahapuri-megrel.jpg.jpeg' },
  { id: 52, name: 'Лахмаджун', price: 500, description: 'Тонкая лепешка с мясной начинкой', category: 'pizza', image: '/images/products/pizza/laxmudgun.jpg.jpeg' },

  // shashlik
  { id: 20, name: 'Шашлык из баранины', price: 750, description: 'Сочный шашлык из молодой баранины на углях', category: 'shashlik', image: '/images/products/shashlik/shashlik-lamb.jpg', weight: 300, unit: 'г' },
  { id: 21, name: 'Шашлык из говядины', price: 700, description: 'Шашлык из говядины', category: 'shashlik', image: '/images/products/shashlik/shashlik-beef.jpg', weight: 300, unit: 'г' },
  { id: 22, name: 'Шашлык из курицы', price: 550, description: 'Нежный куриный шашлык', category: 'shashlik', image: '/images/products/shashlik/shashlik-chicken.jpg', weight: 300, unit: 'г' },
  { id: 23, name: 'Люля-кебаб', price: 600, description: 'Традиционный люля-кебаб на гриле', category: 'shashlik', image: '/images/products/shashlik/lyulya.jpg', weight: 280, unit: 'г' },

  // main-courses
  { id: 30, name: 'Плов по-самаркандски', price: 450, description: 'Традиционный узбекский плов', category: 'main-courses', image: '/images/products/main-courses/plov.jpg', weight: 400, unit: 'г' },
  { id: 31, name: 'Долма', price: 400, description: 'Голубцы в виноградных листьях', category: 'main-courses', image: '/images/products/main-courses/dolma.jpg', weight: 350, unit: 'г' },
  { id: 32, name: 'Бозбаш', price: 380, description: 'Азербайджанское блюдо из баранины', category: 'main-courses', image: '/images/products/main-courses/bozbash.jpg', weight: 400, unit: 'г' },

  // soups
  { id: 10, name: 'Борщ', price: 280, description: 'Классический борщ со сметаной', category: 'soups', image: '/images/products/soups/borsch.jpg', weight: 350, unit: 'мл' },
  { id: 11, name: 'Суп-харчо', price: 300, description: 'Острый грузинский суп', category: 'soups', image: '/images/products/soups/harcho.jpg', weight: 350, unit: 'мл' },
  { id: 12, name: 'Пити', price: 320, description: 'Азербайджанский суп с бараниной', category: 'soups', image: '/images/products/soups/piti.jpg', weight: 400, unit: 'мл' },
  { id: 13, name: 'Куриный бульон', price: 220, description: 'Лёгкий куриный бульон с зеленью', category: 'soups', image: '/images/products/soups/chicken-broth.jpg', weight: 350, unit: 'мл' },

  // salads
  { id: 15, name: 'Салат Цезарь', price: 350, description: 'Классический Цезарь с курицей', category: 'salads', image: '/images/products/salads/caesar.jpg', weight: 250, unit: 'г' },
  { id: 16, name: 'Греческий салат', price: 320, description: 'Свежий греческий салат', category: 'salads', image: '/images/products/salads/greek.jpg', weight: 250, unit: 'г' },
  { id: 17, name: 'Салат из свежих овощей', price: 200, description: 'Лёгкий овощной салат', category: 'salads', image: '/images/products/salads/fresh.jpg', weight: 200, unit: 'г' },

  // kutabs
  { id: 40, name: 'Кутаб с мясом', price: 250, description: 'Тонкий кутаб с говяжьим фаршем', category: 'kutabs', image: '/images/products/kutabs/kutab-meat.jpg', weight: 200, unit: 'г' },
  { id: 41, name: 'Кутаб с зеленью', price: 220, description: 'Кутаб с зеленью и луком', category: 'kutabs', image: '/images/products/kutabs/kutab-herbs.jpg', weight: 180, unit: 'г' },
  { id: 42, name: 'Кутаб с тыквой', price: 220, description: 'Кутаб с тыквенной начинкой', category: 'kutabs', image: '/images/products/kutabs/kutab-pumpkin.jpg', weight: 180, unit: 'г' },
  { id: 43, name: 'Кутаб с сыром', price: 240, description: 'Кутаб с сыром и творогом', category: 'kutabs', image: '/images/products/kutabs/kutab-cheese.jpg', weight: 190, unit: 'г' },

  // breakfast
  { id: 6,  name: 'Яичница с беконом', price: 280, description: 'Яичница глазунья с хрустящим беконом', category: 'breakfast', image: '/images/products/breakfast/eggs-bacon.jpg', weight: 250, unit: 'г' },
  { id: 7,  name: 'Омлет с овощами', price: 250, description: 'Пышный омлет с болгарским перцем', category: 'breakfast', image: '/images/products/breakfast/omelet.jpg', weight: 220, unit: 'г' },
  { id: 8,  name: 'Блины с мёдом', price: 220, description: 'Тонкие блины с натуральным мёдом', category: 'breakfast', image: '/images/products/breakfast/pancakes.jpg', weight: 200, unit: 'г' },
  { id: 9,  name: 'Каша овсяная', price: 180, description: 'Овсяная каша с фруктами', category: 'breakfast', image: '/images/products/breakfast/oatmeal.jpg', weight: 300, unit: 'г' },

  // fries
  { id: 55, name: 'Картофель фри маленький', price: 150, description: 'Хрустящий картофель фри', category: 'fries', image: '/images/products/fries/fries-small.jpg', weight: 100, unit: 'г' },
  { id: 56, name: 'Картофель фри большой', price: 220, description: 'Большая порция картофеля фри', category: 'fries', image: '/images/products/fries/fries-large.jpg', weight: 180, unit: 'г' },
  { id: 57, name: 'Картофель по-деревенски', price: 200, description: 'Запечённый картофель с приправами', category: 'fries', image: '/images/products/fries/country-fries.jpg', weight: 200, unit: 'г' },

  // sauces
  { id: 60, name: 'Соус томатный', price: 50, description: 'Классический томатный соус', category: 'sauces', image: '/images/products/sauces/tomato.jpg', weight: 50, unit: 'г' },
  { id: 61, name: 'Соус чесночный', price: 50, description: 'Нежный чесночный соус', category: 'sauces', image: '/images/products/sauces/garlic.jpg', weight: 50, unit: 'г' },
  { id: 62, name: 'Соус острый', price: 50, description: 'Острый соус чили', category: 'sauces', image: '/images/products/sauces/hot.jpg', weight: 50, unit: 'г' },
  { id: 63, name: 'Соус сырный', price: 60, description: 'Сырный соус с укропом', category: 'sauces', image: '/images/products/sauces/cheese.jpg', weight: 50, unit: 'г' },

  // seasonal
  { id: 65, name: 'Окрошка', price: 280, description: 'Летняя окрошка на квасе', category: 'seasonal', image: '/images/products/seasonal/okroshka.jpg', weight: 350, unit: 'мл' },
  { id: 66, name: 'Шашлык из овощей', price: 300, description: 'Сезонные овощи на гриле', category: 'seasonal', image: '/images/products/seasonal/veggie-shashlik.jpg', weight: 250, unit: 'г' },

  // hot-drinks
  { id: 70, name: 'Кофе эспрессо', price: 120, description: 'Крепкий эспрессо', category: 'hot-drinks', image: '/images/products/hot-drinks/espresso.jpg', volume: 60, unit: 'мл' },
  { id: 71, name: 'Кофе капучино', price: 180, description: 'Нежный капучино с молочной пенкой', category: 'hot-drinks', image: '/images/products/hot-drinks/cappuccino.jpg', volume: 200, unit: 'мл' },
  { id: 72, name: 'Чай чёрный', price: 100, description: 'Крепкий чёрный чай', category: 'hot-drinks', image: '/images/products/hot-drinks/black-tea.jpg', volume: 300, unit: 'мл' },
  { id: 73, name: 'Чай с мятой', price: 120, description: 'Ароматный чай с мятой', category: 'hot-drinks', image: '/images/products/hot-drinks/mint-tea.jpg', volume: 300, unit: 'мл' },
  { id: 74, name: 'Горячий шоколад', price: 200, description: 'Насыщенный горячий шоколад', category: 'hot-drinks', image: '/images/products/hot-drinks/hot-chocolate.jpg', volume: 250, unit: 'мл' },
];

async function main() {
  console.log('Seeding categories...');
  const categoryMap: Record<string, string> = {};

  for (const cat of CATEGORIES) {
    const record = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, sortOrder: cat.sortOrder },
      create: cat,
    });
    categoryMap[cat.slug] = record.id;
    console.log(`  ✓ ${cat.name}`);
  }

  console.log('\nSeeding menu items...');
  let count = 0;
  for (const p of PRODUCTS) {
    const categoryId = categoryMap[p.category];
    if (!categoryId) {
      console.warn(`  ⚠ Категория не найдена: ${p.category}`);
      continue;
    }
    await prisma.menuItem.upsert({
      where: { id: String(p.id) },
      update: {
        name: p.name,
        price: p.price,
        description: p.description ?? null,
        image: p.image ?? null,
        weight: p.weight ?? null,
        volume: p.volume ?? null,
        unit: p.unit ?? null,
        categoryId,
      },
      create: {
        id: String(p.id),
        name: p.name,
        price: p.price,
        description: p.description ?? null,
        image: p.image ?? null,
        weight: p.weight ?? null,
        volume: p.volume ?? null,
        unit: p.unit ?? null,
        categoryId,
      },
    });
    count++;
  }

  console.log(`\n✔ Done: ${CATEGORIES.length} categories, ${count} menu items`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
