<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Role extends Model
{
    protected $fillable = ['name', 'display_name', 'description', 'color', 'is_system'];

    protected $casts = [
        'is_system' => 'boolean',
    ];
}
