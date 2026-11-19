<?php
/**
 * Form settings — edit these before going live.
 */
return [
    // Who receives each form. Several addresses may be comma-separated.
    'recipients' => [
        'contact'     => 'zanctokpharma@hotmail.com',
        'partner'     => 'zanctokpharma@hotmail.com',
        'side_effect' => 'zanctokpharma@hotmail.com',   // ideally the pharmacovigilance officer
    ],

    // MUST be an address on the zanctok.com domain, otherwise mail is likely to land in spam.
    // Create this mailbox in GoDaddy (or use an existing one such as info@zanctok.com).
    'from_email' => 'noreply@zanctok.com',
    'from_name'  => 'Zanctok Website',

    // Anti-spam
    'min_seconds'      => 3,    // reject forms submitted faster than this (bots)
    'max_per_hour_ip'  => 8,    // submissions allowed per IP per hour

    // Keep a private backup copy of every submission in forms/data/ (protected by .htaccess)
    'keep_backup' => true,
];
