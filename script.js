/**************************************************************
 * SCRIPT.JS - Цялостен скрипт за файлов браузър с Upload
 **************************************************************/
$(function () {
  "use strict";

  const filemanager   = $(".filemanager");
  const breadcrumbs   = $(".breadcrumbs");
  const fileList      = filemanager.find(".data");
  const nothingFound  = filemanager.find(".nothingfound");

  // Модален прозорец
  const previewModal  = $("#preview-modal");
  const modalContent  = $("#modal-content");
  const closeBtn      = $("#close-btn");

  // Upload
  const uploadArea    = $("#upload-area");
  const fileInput     = $("#file-input");

  let currentPath     = "";
  let breadcrumbsUrls = [];
  let responseData    = [];

  /**************************************************************
   * 1) Зареждаме данните от scan.php
   **************************************************************/
  $.get("scan.php", function (data) {
    responseData = [data];
    // Следим hash-а (промени в URL), за навигация
    $(window).on("hashchange", function() {
      navigateTo(window.location.hash);
    }).trigger("hashchange");
  });

  /**************************************************************
   * 2) Навигация според # в URL
   **************************************************************/
  function navigateTo(hash) {
    const trimmedHash = decodeURIComponent(hash).slice(1).split("=");
    if (trimmedHash.length) {
      let renderData = "";

      // #search=term
      if (trimmedHash[0] === "search") {
        const term = trimmedHash[1] ? trimmedHash[1].toLowerCase() : "";
        filemanager.addClass("searching");
        renderData = searchItems(responseData, term);
        render(renderData, true);
      }
      // #files/SomeDirectory
      else if (trimmedHash[0].trim().length) {
        const pathDecoded = trimmedHash[0].trim();
        renderData = searchByPath(pathDecoded);
        currentPath = pathDecoded;
        breadcrumbsUrls = generateBreadcrumbs(pathDecoded);
        render(renderData);
      }
      // Празен hash -> начална директория
      else {
        currentPath = responseData[0].path; // трябва да е "files"
        breadcrumbsUrls = [currentPath];
        render(searchByPath(currentPath));
      }
    }
  }

  /**************************************************************
   * 3) Търсене (рекурсивно) на папки/файлове
   **************************************************************/
  function searchItems(data, searchTerm) {
    let folders = [], files = [];

    data.forEach(function(d) {
      if (d.type === "folder") {
        const result = searchItems(d.items, searchTerm);
        if (d.name.toLowerCase().includes(searchTerm)) {
          folders.push(d);
        }
        folders = folders.concat(result.folders);
        files   = files.concat(result.files);
      }
      else if (d.type === "file") {
        if (d.name.toLowerCase().includes(searchTerm)) {
          files.push(d);
        }
      }
    });

    return { folders, files };
  }

  /**************************************************************
   * 4) Генериране на breadcrumbs
   **************************************************************/
  function generateBreadcrumbs(path) {
    const parts = path.split("/");
    for (let i = 1; i < parts.length; i++) {
      parts[i] = parts[i - 1] + "/" + parts[i];
    }
    return parts;
  }

  /**************************************************************
   * 5) Търси в JSON структурата по път (dir)
   **************************************************************/
  function searchByPath(dir) {
    let pathArr = dir.split("/");
    let dataRef = responseData;
    let found   = false;

    for (let i = 0; i < pathArr.length; i++) {
      found = false;
      for (let j = 0; j < dataRef.length; j++) {
        if (dataRef[j].name === pathArr[i]) {
          found = true;
          dataRef = dataRef[j].items;
          break;
        }
      }
      if (!found) break;
    }
    return found ? dataRef : [];
  }

  /**************************************************************
   * 6) Рендиране на резултатите (папки + файлове)
   **************************************************************/
  function render(data, isSearch) {
    let scannedFolders = [];
    let scannedFiles   = [];

    if (Array.isArray(data)) {
      data.forEach(item => {
        if (item.type === "folder") scannedFolders.push(item);
        else if (item.type === "file") scannedFiles.push(item);
      });
    } else {
      scannedFolders = data.folders;
      scannedFiles   = data.files;
    }

    fileList.empty().hide();

    // Няма резултати?
    if (!scannedFolders.length && !scannedFiles.length) {
      nothingFound.show();
    } else {
      nothingFound.hide();
    }

    // Папки
    scannedFolders.forEach(function(folder) {
      let itemsCount = folder.items.length;
      let folderIcon = itemsCount ? "fa-folder-open" : "fa-folder";

      // "fa-3x" прави иконата по-голяма, може да сложиш и style="font-size: 2.5rem;"
      const folderHTML = $(`
        <li class="folders">
          <a href="#${folder.path}" title="${folder.path}" class="folders">
            <span class="icon fa-3x">
              <i class="fas ${folderIcon}"></i>
            </span>
            <span class="name">${escapeHTML(folder.name)}</span>
          </a>
        </li>
      `);
      fileList.append(folderHTML);
    });

    // Файлове
    scannedFiles.forEach(function(file) {
      let fileName = escapeHTML(file.name);
      let ext      = fileName.split(".").pop().toLowerCase();
      let iconClass= "fa-file"; // по подразбиране

      // Списък от разширения
      if(["jpg","jpeg","png","gif","webp"].includes(ext)) iconClass = "fa-file-image";
      else if(ext === "pdf") iconClass = "fa-file-pdf";
      else if(["zip","rar","7z"].includes(ext)) iconClass = "fa-file-archive";
      else if(ext === "exe") iconClass = "fa-gears";  
      else if(ext === "php") iconClass = "fa-code";
      else if(ext === "css") iconClass = "fa-file-code";
      else if(["htm","html","xhtml"].includes(ext)) iconClass = "fa-file-code";

      const fileHTML = $(`
        <li class="files">
          <a href="${file.path}" title="${file.path}" class="files" data-ext="${ext}">
            <span class="icon fa-3x">
              <i class="fas ${iconClass}"></i>
            </span>
            <span class="name">${fileName}</span>
          </a>
        </li>
      `);
      fileList.append(fileHTML);
    });

    // Breadcrumbs
    let breadcrumbHTML = "";
    if (filemanager.hasClass("searching") && isSearch) {
      breadcrumbHTML = "<span>Резултати от търсене:</span>";
    } else {
      breadcrumbsUrls.forEach(function(u, i) {
        const arr = u.split("/");
        const displayName = arr[arr.length - 1];
        if (i !== breadcrumbsUrls.length - 1) {
          breadcrumbHTML += `<a href="#${u}">${displayName}</a> <span class="arrow">›</span> `;
        } else {
          breadcrumbHTML += `<span>${displayName}</span>`;
        }
      });
    }
    breadcrumbs.html(breadcrumbHTML);

    // Плавно показваме
    fileList.fadeIn();

    // Клик на папка
    $(".folders a").off("click").on("click", function(e) {
      e.preventDefault();
      let nextDir = $(this).attr("href").replace(/^#/, ""); // Премахни допълнителен #

      if (filemanager.hasClass("searching")) {
        filemanager.removeClass("searching");
        breadcrumbsUrls = generateBreadcrumbs(nextDir);
      } else {
        breadcrumbsUrls.push(nextDir);
      }
      window.location.hash = encodeURIComponent(nextDir); // Обнови hash без допълнителен #
      currentPath = nextDir;
    });

    // Клик на файл
    $(".files a").off("click").on("click", function(e) {
      e.preventDefault();
      let filePath = $(this).attr("href");
      let ext      = $(this).data("ext");

      // Ако е изображение
      if(["jpg","jpeg","png","gif","webp"].includes(ext)) {
        previewModal.fadeIn();
        modalContent.html(`<img src="${filePath}" alt="${filePath}" style="max-width:100%;"/>`);
      }
      // Ако е PDF
      else if(ext === "pdf") {
        previewModal.fadeIn();
        modalContent.html(`
          <embed src="${filePath}" type="application/pdf" style="width:100%; height:80vh;" />
          <div style="margin-top:10px;">
            <a href="${filePath}" download class="download-btn" style="color:#fff; text-decoration:underline;">
              Свали PDF
            </a>
          </div>
        `);
      }
      // Иначе -> директно сваляне/отваряне
      else {
        window.location.href = filePath;
      }
    });
  }

  /**************************************************************
   * 7) Функция за escape на HTML
   **************************************************************/
  function escapeHTML(text) {
    return text.replace(/&/g, "&amp;")
               .replace(/</g, "&lt;")
               .replace(/>/g, "&gt;");
  }

  /**************************************************************
   * 8) Затваряне на модал
   **************************************************************/
  closeBtn.click(function() {
    previewModal.fadeOut();
    modalContent.html("");
  });
  previewModal.click(function(e) {
    if(e.target.id === "preview-modal") {
      previewModal.fadeOut();
      modalContent.html("");
    }
  });

  /**************************************************************
   * 9) Търсене (клик на иконата + input)
   **************************************************************/
  $(".search i").click(function() {
    $(this).parent().toggleClass("active");
  });
  $(".search input[type='search']").on("input", function() {
    const val = $(this).val().trim();
    if(val.length) {
      filemanager.addClass("searching");
      window.location.hash = "search=" + encodeURIComponent(val);
    } else {
      filemanager.removeClass("searching");
      window.location.hash = encodeURIComponent(currentPath);
    }
  }).on("keyup", function(e) {
    if(e.keyCode === 27) { // ESC
      $(this).val("").parent().removeClass("active");
      filemanager.removeClass("searching");
      window.location.hash = encodeURIComponent(currentPath);
    }
  });

  /**************************************************************
   * 10) Drag & Drop + Upload
   **************************************************************/
  uploadArea.on("dragenter dragover", function(e) {
    e.preventDefault();
    e.stopPropagation();
    $(this).addClass("drag-over");
  }).on("dragleave", function(e) {
    e.preventDefault();
    e.stopPropagation();
    $(this).removeClass("drag-over");
  }).on("drop", function(e) {
    e.preventDefault();
    e.stopPropagation();
    $(this).removeClass("drag-over");
    let files = e.originalEvent.dataTransfer.files;
    uploadFiles(files);
  });

  $("#browse-btn").click(function() {
    fileInput.click();
  });
  fileInput.change(function(e) {
    let files = e.target.files;
    uploadFiles(files);
  });

  function uploadFiles(files) {
    if(!files.length) return;
    
    // Качваме *първия* файл от multiple (или може да сложиш цикъл за всички)
    // Ако искаш да качиш ВСИЧКИ, обикаляш "for(...)"
    // Ето пример за качване на всички:
    $.each(files, function(idx, singleFile){
      let formData = new FormData();
      formData.append("file", singleFile);

      // Изпращаме чрез AJAX
      $.ajax({
        url: "upload.php",
        type: "POST",
        data: formData,
        processData: false,
        contentType: false,
        success: function(res) {
          let resp = {};
          try {
            resp = JSON.parse(res);
          } catch(e) {
            console.error("Грешен JSON:", res);
            return;
          }
          if(resp.status === "success") {
            console.log("Качен файл:", singleFile.name);
          } else {
            alert("Грешка при качване: " + resp.message);
          }
          // Презареждаме, за да видим новите файлове
          window.location.reload();
        },
        error: function(err) {
          alert("Грешка при качване.");
        }
      });
    });
  }
});