<?php
/**
 * Примерен скрипт за качване на файлове чрез POST/Drag&Drop
 */

$uploadDir = "files/";

if (!empty($_FILES["file"])) {
    $fileName = basename($_FILES["file"]["name"]);
    $targetFilePath = $uploadDir . $fileName;

    if(move_uploaded_file($_FILES["file"]["tmp_name"], $targetFilePath)) {
        echo json_encode(["status" => "success", "message" => "Файлът е качен успешно!"]);
    } else {
        echo json_encode(["status" => "error", "message" => "Възникна грешка при качването."]);
    }
} else {
    echo json_encode(["status" => "error", "message" => "Няма прикачен файл."]);
}
