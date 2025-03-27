<?php
// filepath: c:\Users\ronni\Tools\UNO Dashboard\dashboard\uno-dashboard\network-dashboard\src\app\components\garbage.php
<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Length: 10485760'); // 10MB
echo str_repeat('0', 10485760);
?>