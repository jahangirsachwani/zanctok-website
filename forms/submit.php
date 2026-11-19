<?php
/**
 * Zanctok website form handler (contact, partner, side-effect report).
 * Works on GoDaddy Linux / cPanel hosting using PHP mail().
 */
declare(strict_types=1);

$config = require __DIR__ . '/config.php';
$wantsJson = stripos($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json') !== false;

function respond(bool $ok, string $message, int $code = 200): void
{
    global $wantsJson;
    http_response_code($code);
    if ($wantsJson) {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['ok' => $ok, 'message' => $message]);
    } else {
        header('Content-Type: text/html; charset=utf-8');
        $msg = htmlspecialchars($message, ENT_QUOTES, 'UTF-8');
        echo "<!doctype html><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'>"
           . "<title>Zanctok</title><body style='font-family:system-ui;max-width:560px;margin:80px auto;padding:0 20px;color:#0E1A2B'>"
           . "<h1 style='color:#0A1F44'>" . ($ok ? 'Thank you' : 'Sorry') . "</h1><p>$msg</p>"
           . "<p><a href='/index.html' style='color:#1B3E91'>Return to the website</a></p></body>";
    }
    exit;
}

function clean(string $key, int $max = 500): string
{
    $v = trim((string)($_POST[$key] ?? ''));
    $v = str_replace(["\r\n", "\r"], "\n", $v);
    return mb_substr($v, 0, $max);
}

function oneLine(string $v): string
{
    return trim(preg_replace('/[\r\n\t]+/', ' ', $v)); // prevents header injection
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    respond(false, 'Invalid request.', 405);
}

// --- Spam checks -----------------------------------------------------------
if (!empty($_POST['website'])) {                       // honeypot filled → bot
    respond(true, 'Thank you — your message has been sent.');
}
$ts = (int)($_POST['_ts'] ?? 0);
if ($ts > 0 && (time() - $ts) < $config['min_seconds']) {
    respond(false, 'Please take a moment to complete the form and try again.', 429);
}

$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$rateFile = sys_get_temp_dir() . '/zpl_rate_' . md5($ip);
$hits = array_filter(
    is_file($rateFile) ? (array)json_decode((string)file_get_contents($rateFile), true) : [],
    fn($t) => $t > time() - 3600
);
if (count($hits) >= $config['max_per_hour_ip']) {
    respond(false, 'Too many submissions. Please try again later or contact us by phone.', 429);
}

// --- Form definitions ------------------------------------------------------
$type = clean('form_type', 20);
$forms = [
    'contact' => [
        'subject'  => 'Website enquiry',
        'required' => ['name', 'email', 'message', 'consent'],
        'fields'   => ['name' => 'Name', 'organisation' => 'Organisation', 'email' => 'Email', 'phone' => 'Phone', 'subject' => 'Subject', 'message' => 'Message'],
    ],
    'partner' => [
        'subject'  => 'Partnership enquiry',
        'required' => ['enquiry_type', 'name', 'organisation', 'email', 'phone', 'city', 'message', 'consent'],
        'fields'   => ['enquiry_type' => 'Enquiry type', 'name' => 'Contact person', 'organisation' => 'Organisation', 'email' => 'Email', 'phone' => 'Phone', 'city' => 'City', 'products' => 'Products of interest', 'message' => 'Requirements'],
    ],
    'side_effect' => [
        'subject'  => 'ADVERSE EVENT REPORT',
        'required' => ['reporter_role', 'name', 'phone', 'product', 'message', 'consent'],
        'fields'   => ['reporter_role' => 'Reporter', 'name' => 'Reporter name', 'phone' => 'Phone', 'email' => 'Email',
                       'patient_initials' => 'Patient initials', 'patient_age' => 'Age', 'patient_sex' => 'Sex', 'patient_weight' => 'Weight (kg)',
                       'product' => 'Product', 'batch' => 'Batch #', 'dose' => 'Dose', 'date_started' => 'Date started',
                       'message' => 'Description of reaction', 'date_onset' => 'Reaction onset', 'outcome' => 'Outcome', 'other_medicines' => 'Other medicines'],
    ],
];
if (!isset($forms[$type])) {
    respond(false, 'Unknown form.', 400);
}
$form = $forms[$type];

// --- Validate --------------------------------------------------------------
$data = [];
foreach ($form['fields'] as $key => $label) {
    $data[$key] = clean($key, $key === 'message' ? 4000 : 300);
}
foreach ($form['required'] as $key) {
    if ($key === 'consent') {
        if (empty($_POST['consent'])) respond(false, 'Please tick the consent box.', 422);
        continue;
    }
    if (($data[$key] ?? '') === '') respond(false, 'Please complete all required fields.', 422);
}
if ($data['email'] ?? '' ) {
    if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) respond(false, 'Please enter a valid email address.', 422);
}

// --- Build email -----------------------------------------------------------
$lines = [];
foreach ($form['fields'] as $key => $label) {
    if (($data[$key] ?? '') !== '') $lines[] = str_pad($label . ':', 26) . $data[$key];
}
$body = $form['subject'] . " — submitted " . date('d M Y, H:i') . "\n"
      . str_repeat('-', 60) . "\n" . implode("\n", $lines) . "\n" . str_repeat('-', 60) . "\n"
      . "IP: $ip\nPage: " . oneLine($_SERVER['HTTP_REFERER'] ?? '-') . "\n";

$subject = '[ZPL Website] ' . $form['subject'] . ' — ' . oneLine($data['name'] ?? '');
if ($type === 'side_effect') $subject .= ' — ' . oneLine($data['product']);

$from = oneLine($config['from_email']);
$headers = [
    'From: ' . '=?UTF-8?B?' . base64_encode($config['from_name']) . '?=' . " <$from>",
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'X-Mailer: ZPL-Website',
];
if (!empty($data['email'])) $headers[] = 'Reply-To: ' . oneLine($data['email']);
if ($type === 'side_effect') $headers[] = 'X-Priority: 1';

// --- Backup copy -----------------------------------------------------------
if ($config['keep_backup']) {
    $dir = __DIR__ . '/data';
    if (!is_dir($dir)) @mkdir($dir, 0750, true);
    @file_put_contents("$dir/$type-" . date('Y-m') . '.jsonl',
        json_encode(['time' => date('c'), 'ip' => $ip] + $data, JSON_UNESCAPED_UNICODE) . "\n", FILE_APPEND | LOCK_EX);
}

// --- Send ------------------------------------------------------------------
$sent = @mail(
    $config['recipients'][$type],
    '=?UTF-8?B?' . base64_encode($subject) . '?=',
    $body,
    implode("\r\n", $headers),
    '-f' . $from
);

$hits[] = time();
@file_put_contents($rateFile, json_encode(array_values($hits)));

if (!$sent) {
    respond(false, 'We could not send your message right now.', 500);
}
respond(true, $type === 'side_effect'
    ? 'Thank you — your report has been received. Our safety team may contact you for more details.'
    : 'Thank you — your message has been sent. Our team will contact you shortly.');
