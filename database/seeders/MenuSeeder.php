<?php

namespace Database\Seeders;

use App\Models\Menu;
use Illuminate\Database\Seeder;

class MenuSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $menus = [
            // Makanan
            [
                'name' => 'Nasi Goreng Spesial',
                'price' => 25000,
                'description' => 'Nasi goreng dengan telur, ayam, dan sayuran',
                'category' => 'Makanan',
                'status' => 'Tersedia',
                'image' => 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=400&h=400&q=80',
                'image_cropped' => 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=400&h=400&q=80',
            ],
            [
                'name' => 'Mie Goreng',
                'price' => 20000,
                'description' => 'Mie goreng dengan sayuran dan telur',
                'category' => 'Makanan',
                'status' => 'Tersedia',
                'image' => 'https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=400&h=400&q=80',
                'image_cropped' => 'https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=400&h=400&q=80',
            ],
            [
                'name' => 'Ayam Geprek',
                'price' => 28000,
                'description' => 'Ayam goreng dengan sambal geprek pedas',
                'category' => 'Makanan',
                'status' => 'Tersedia',
                'image' => 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=400&h=400&q=80',
                'image_cropped' => 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=400&h=400&q=80',
            ],
            [
                'name' => 'Sate Ayam',
                'price' => 30000,
                'description' => '10 tusuk sate ayam dengan bumbu kacang',
                'category' => 'Makanan',
                'status' => 'Tersedia',
                'image' => 'https://images.unsplash.com/photo-1529042410759-befb1204b468?auto=format&fit=crop&w=400&h=400&q=80',
                'image_cropped' => 'https://images.unsplash.com/photo-1529042410759-befb1204b468?auto=format&fit=crop&w=400&h=400&q=80',
            ],
            [
                'name' => 'Bakso Spesial',
                'price' => 22000,
                'description' => 'Bakso sapi dengan mie dan pangsit',
                'category' => 'Makanan',
                'status' => 'Tersedia',
                'image' => 'https://images.unsplash.com/photo-1598449356475-b9f71bc7d847?auto=format&fit=crop&w=400&h=400&q=80',
                'image_cropped' => 'https://images.unsplash.com/photo-1598449356475-b9f71bc7d847?auto=format&fit=crop&w=400&h=400&q=80',
            ],
            
            // Minuman
            [
                'name' => 'Es Teh Manis',
                'price' => 5000,
                'description' => 'Es teh manis segar',
                'category' => 'Minuman',
                'status' => 'Tersedia',
                'image' => 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=400&h=400&q=80',
                'image_cropped' => 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=400&h=400&q=80',
            ],
            [
                'name' => 'Es Jeruk',
                'price' => 8000,
                'description' => 'Es jeruk peras segar',
                'category' => 'Minuman',
                'status' => 'Tersedia',
                'image' => 'https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=400&h=400&q=80',
                'image_cropped' => 'https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=400&h=400&q=80',
            ],
            [
                'name' => 'Jus Alpukat',
                'price' => 15000,
                'description' => 'Jus alpukat segar dengan susu',
                'category' => 'Minuman',
                'status' => 'Tersedia',
                'image' => 'https://images.unsplash.com/photo-1589733966041-b112637a0440?auto=format&fit=crop&w=400&h=400&q=80',
                'image_cropped' => 'https://images.unsplash.com/photo-1589733966041-b112637a0440?auto=format&fit=crop&w=400&h=400&q=80',
            ],
            [
                'name' => 'Es Cappuccino',
                'price' => 18000,
                'description' => 'Kopi cappuccino dingin',
                'category' => 'Minuman',
                'status' => 'Tersedia',
                'image' => 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=400&h=400&q=80',
                'image_cropped' => 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=400&h=400&q=80',
            ],
            [
                'name' => 'Lemon Tea',
                'price' => 10000,
                'description' => 'Teh dengan perasan lemon segar',
                'category' => 'Minuman',
                'status' => 'Tersedia',
                'image' => 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=400&h=400&q=80',
                'image_cropped' => 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=400&h=400&q=80',
            ],
            
            // Es Krim
            [
                'name' => 'Es Krim Vanilla',
                'price' => 12000,
                'description' => 'Es krim vanilla premium',
                'category' => 'Es Krim',
                'status' => 'Tersedia',
                'image' => 'https://images.unsplash.com/photo-1570197788417-0e82375c9371?auto=format&fit=crop&w=400&h=400&q=80',
                'image_cropped' => 'https://images.unsplash.com/photo-1570197788417-0e82375c9371?auto=format&fit=crop&w=400&h=400&q=80',
            ],
            [
                'name' => 'Es Krim Coklat',
                'price' => 12000,
                'description' => 'Es krim coklat premium',
                'category' => 'Es Krim',
                'status' => 'Tersedia',
                'image' => 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=400&h=400&q=80',
                'image_cropped' => 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=400&h=400&q=80',
            ],
            [
                'name' => 'Es Krim Strawberry',
                'price' => 14000,
                'description' => 'Es krim strawberry dengan potongan buah',
                'category' => 'Es Krim',
                'status' => 'Tersedia',
                'image' => 'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?auto=format&fit=crop&w=400&h=400&q=80',
                'image_cropped' => 'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?auto=format&fit=crop&w=400&h=400&q=80',
            ],
            [
                'name' => 'Sundae Spesial',
                'price' => 20000,
                'description' => 'Es krim dengan topping coklat, kacang, dan cherry',
                'category' => 'Es Krim',
                'status' => 'Tersedia',
                'image' => 'https://images.unsplash.com/photo-1505394033-41a83a21df9f?auto=format&fit=crop&w=400&h=400&q=80',
                'image_cropped' => 'https://images.unsplash.com/photo-1505394033-41a83a21df9f?auto=format&fit=crop&w=400&h=400&q=80',
            ],
            [
                'name' => 'Es Krim Matcha',
                'price' => 16000,
                'description' => 'Es krim rasa green tea Jepang',
                'category' => 'Es Krim',
                'status' => 'Tersedia',
                'image' => 'https://images.unsplash.com/photo-1506084868230-bb9d95c24759?auto=format&fit=crop&w=400&h=400&q=80',
                'image_cropped' => 'https://images.unsplash.com/photo-1506084868230-bb9d95c24759?auto=format&fit=crop&w=400&h=400&q=80',
            ],
        ];

        foreach ($menus as $menu) {
            Menu::updateOrCreate(
                ['name' => $menu['name']],
                $menu
            );
        }
    }
}
