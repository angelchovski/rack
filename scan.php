<?php
/**
 * Сканиране на "files/" и изкарване на JSON
 */
$dir = "files"; // без / отпред!
$response = scan($dir);

header('Content-type: application/json');
echo json_encode([
    "name"  => "files",
    "type"  => "folder",
    "path"  => $dir,
    "items" => $response
]);

function scan($dir) {
    $files = [];
    if (file_exists($dir)) {
        foreach (scandir($dir) as $f) {
            if (!$f || $f[0] === '.') {
                continue;
            }
            $fullPath = $dir . '/' . $f;
            if (is_dir($fullPath)) {
                $files[] = [
                    "name" => $f,
                    "type" => "folder",
                    "path" => $fullPath,
                    "items"=> scan($fullPath)
                ];
            } else {
                $files[] = [
                    "name" => $f,
                    "type" => "file",
                    "path" => $fullPath,
                    "size" => filesize($fullPath)
                ];
            }
        }
    }
    return $files;
}
