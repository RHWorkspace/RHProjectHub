<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $existing = DB::table('roles')->pluck('name')->flip();

        $positional = [
            ['name' => 'chief',            'display_name' => 'Chief',            'description' => 'Kepala tim / pemimpin proyek.',          'color' => '#8b5cf6'],
            ['name' => 'system_analyst',   'display_name' => 'System Analyst',   'description' => 'Analis sistem dan kebutuhan bisnis.',      'color' => '#6366f1'],
            ['name' => 'business_analyst', 'display_name' => 'Business Analyst', 'description' => 'Analisis proses bisnis dan dokumentasi.',  'color' => '#0ea5e9'],
            ['name' => 'developer',        'display_name' => 'Developer',        'description' => 'Pengembang perangkat lunak.',              'color' => '#10b981'],
            ['name' => 'qa',               'display_name' => 'QA',               'description' => 'Quality Assurance / penguji perangkat.',   'color' => '#f59e0b'],
            ['name' => 'tw',               'display_name' => 'TW',               'description' => 'Technical Writer.',                        'color' => '#f97316'],
            ['name' => 'guest',            'display_name' => 'Guest',            'description' => 'Anggota dengan akses terbatas.',           'color' => '#94a3b8'],
        ];

        foreach ($positional as $role) {
            if (!isset($existing[$role['name']])) {
                DB::table('roles')->insert(array_merge($role, [
                    'is_system'  => false,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]));
            }
        }
    }

    public function down(): void
    {
        DB::table('roles')->whereIn('name', [
            'chief', 'system_analyst', 'business_analyst', 'developer', 'qa', 'tw', 'guest',
        ])->delete();
    }
};
