<?php
/**
 * Dugi's Burger – odesílání kontaktního formuláře a rezervací na e-mail.
 * Funguje na běžném PHP hostingu s povolenou funkcí mail().
 */

// ===== NASTAVENÍ – ZMĚŇ =====
const TO_EMAIL   = 'tomas210408@gmail.com';      // kam budou chodit dotazy a rezervace
const FROM_EMAIL = 'web@dugisburger.cz';       // odesílatel – ideálně adresa na stejné doméně jako web
// ============================

header('Content-Type: application/json; charset=utf-8');

function respond(bool $ok, string $error = '', int $code = 200): void
{
    http_response_code($code);
    echo json_encode(['ok' => $ok, 'error' => $error], JSON_UNESCAPED_UNICODE);
    exit;
}

function clean(string $key, int $max = 200): string
{
    $value = trim((string)($_POST[$key] ?? ''));
    $value = str_replace(["\r", "\n"], ' ', $value);   // ochrana proti vložení hlaviček
    return mb_substr($value, 0, $max);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(false, 'Nepovolená metoda.', 405);
}

// Honeypot – skryté pole vyplňují jen roboti
if (!empty($_POST['website'])) {
    respond(true);
}

$type    = clean('type', 20);
$name    = clean('name', 100);
$email   = clean('email', 150);
$message = mb_substr(trim((string)($_POST['message'] ?? '')), 0, 3000);

if ($name === '') {
    respond(false, 'Vyplň prosím jméno.', 422);
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    respond(false, 'Zadej prosím platný e-mail.', 422);
}

if ($type === 'reservation') {
    $phone  = clean('phone', 30);
    $people = clean('people', 10);
    $date   = clean('date', 10);
    $time   = clean('time', 5);

    if (!preg_match('/^[0-9 +()\-]{9,20}$/', $phone)) {
        respond(false, 'Zadej prosím platné telefonní číslo.', 422);
    }
    if (!in_array($people, ['1', '2', '3', '4', '5', '6', '7-10'], true)) {
        respond(false, 'Vyber prosím počet lidí.', 422);
    }
    $d = DateTime::createFromFormat('Y-m-d', $date);
    if (!$d || $d->format('Y-m-d') !== $date || $date < date('Y-m-d')) {
        respond(false, 'Vyber prosím platné datum.', 422);
    }
    if (!preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $time)) {
        respond(false, 'Vyber prosím čas.', 422);
    }

    $dateCz  = $d->format('j. n. Y');
    $subject = "Nová rezervace: $name – $dateCz $time ($people os.)";
    $body    = "NOVÁ REZERVACE Z WEBU\n"
             . "=====================\n\n"
             . "Jméno:     $name\n"
             . "Telefon:   $phone\n"
             . "E-mail:    $email\n"
             . "Počet lidí: $people\n"
             . "Datum:     $dateCz\n"
             . "Čas:       $time\n\n"
             . "Poznámka:\n" . ($message !== '' ? $message : '—') . "\n";
} elseif ($type === 'contact') {
    if ($message === '') {
        respond(false, 'Napiš nám prosím zprávu.', 422);
    }
    $subject = "Dotaz z webu: $name";
    $body    = "NOVÝ DOTAZ Z WEBU\n"
             . "=================\n\n"
             . "Jméno:  $name\n"
             . "E-mail: $email\n\n"
             . "Zpráva:\n$message\n";
} else {
    respond(false, 'Neznámý formulář.', 400);
}

$headers = [
    'From: Dugi\'s Burger web <' . FROM_EMAIL . '>',
    'Reply-To: ' . $email,                       // "Odpovědět" v poště půjde rovnou zákazníkovi
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
];

$encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';

if (mail(TO_EMAIL, $encodedSubject, $body, implode("\r\n", $headers))) {
    respond(true);
}

respond(false, 'Odeslání se nepovedlo. Zkus to prosím znovu, nebo nám zavolej.', 500);
