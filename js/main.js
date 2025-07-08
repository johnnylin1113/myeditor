import Storehouse from './storehouse-js/dist/storehouse.js';
import * as monaco from 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/+esm';
import { marked } from './marked/lib/marked.esm.js';
import DOMPurify from './dompurify/dist/purify.es.mjs';
//import '../css/github-markdown-light.css';

//import 'github-markdown-css/github-markdown-light.css';

const init = () => {
    let hasEdited = false;
    let scrollBarSync = false;

    const localStorageNamespace = 'com.markdownlivepreview';
    const localStorageKey = 'last_state';
    const localStorageScrollBarKey = 'scroll_bar_settings';
    const confirmationMessage = 'Are you sure you want to reset? Your changes will be lost.';
    // default template
    const defaultInput = `# Markdown syntax guide

## Headers

# This is a Heading h1
## This is a Heading h2
### This is a Heading h3
#### This is a Heading h4
##### This is a Heading h5
###### This is a Heading h6

## Emphasis

*This text will be italic*  
_This will also be italic_

**This text will be bold**  
__This will also be bold__

_You **can** combine them_

## Lists

### Unordered

* Item 1
* Item 2
    * Item 2a
    * Item 2b
* Item 3
    * Item 3a
    * Item 3b

### Ordered

1. Item 1
2. Item 2
3. Item 3
    1. Item 3a
    2. Item 3b

## Images

![This is an alt text.](https://t4.ftcdn.net/jpg/01/43/42/83/360_F_143428338_gcxw3Jcd0tJpkvvb53pfEztwtU9sxsgT.jpg "This is a sample image.")

## Links

You may be using [Google Search](https://www.google.com/).

## Blockquotes

> Markdown is a lightweight markup language with plain-text-formatting syntax, created in 2004 by John Gruber with Aaron Swartz.
>
>> Markdown is often used to format readme files, for writing messages in online discussion forums, and to create rich text using a plain text editor.

## Tables

| Left columns  | Right columns |
| ------------- |:-------------:|
| left foo      | right foo     |
| left bar      | right bar     |
| left baz      | right baz     |

## Blocks of code

${"`"}${"`"}${"`"}
let message = 'Hello world';
alert(message);
${"`"}${"`"}${"`"}

## Inline code

This web site is using ${"`"}markedjs/marked${"`"}.
`;


self.MonacoEnvironment = {
    getWorker(_, label) {
        return new Proxy({}, { get: () => () => { } });
    }
}

let setupEditor = () => {
        // requied to regist for folding function
        monaco.languages.registerFoldingRangeProvider('markdown', {
            provideFoldingRanges: function (model, context, token) {
                const lines = model.getLinesContent();
                const ranges = [];

                for (let i = 0; i < lines.length; i++) {
                    if (lines[i].includes('<!-- #start of image raw -->')) {
                        let start = i + 1;
                        let end = start;

                        // Find end
                        while (end < lines.length && !lines[end].includes('<!-- #end of image raw -->')) {
                            end++;
                        }

                        if (end > start) {
                            ranges.push({
                                start: start,
                                end: end,
                                kind: monaco.languages.FoldingRangeKind.Region
                            });
                        }
                    }
                }

                return ranges;
            }
        });

    let editor = monaco.editor.create(document.querySelector('#editor'), {
        fontSize: 14,
            language: 'markdown',
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            scrollbar: {
                vertical: 'visible',
                horizontal: 'visible'
            },
            wordWrap: 'on',
            hover: { enabled: false },
            quickSuggestions: false,
            suggestOnTriggerCharacters: false,
            //folding: false,
            folding: true,
            showFoldingControls: 'always',
            foldingImportsByDefault: true,
        });

        setTimeout(() => {
            editor.getAction('editor.foldAllMarkerRegions').run();
        }, 500);

        editor.onDidChangeModelContent(() => {
            let changed = editor.getValue() != defaultInput;
            if (changed) {
                hasEdited = true;
            }
            let value = editor.getValue();
            convert(value);
            saveLastContent(value);
        });

        editor.onDidScrollChange((e) => {
            if (!scrollBarSync) {
                return;
            }

            const scrollTop = e.scrollTop;
            const scrollHeight = e.scrollHeight;
            const height = editor.getLayoutInfo().height;

            const maxScrollTop = scrollHeight - height;
            const scrollRatio = scrollTop / maxScrollTop;

            let previewElement = document.querySelector('#preview');
            let targetY = (previewElement.scrollHeight - previewElement.clientHeight) * scrollRatio;
            previewElement.scrollTo(0, targetY);
        });

        return editor;
    };

    // Render markdown text as html
    let convert = (markdown) => {
        let options = {
            headerIds: false,
            mangle: false
        };
        let html = marked.parse(markdown, options);
        let sanitized = DOMPurify.sanitize(html);
        document.querySelector('#output').innerHTML = sanitized;
    };

    // Reset input text
    let reset = () => {
        let changed = editor.getValue() != defaultInput;
        if (hasEdited || changed) {
            var confirmed = window.confirm(confirmationMessage);
            if (!confirmed) {
                return;
            }
        }
        presetValue(defaultInput);
        document.querySelectorAll('.column').forEach((element) => {
            element.scrollTo({ top: 0 });
        });
    };

    let presetValue = (value) => {
        editor.setValue(value);
        editor.revealPosition({ lineNumber: 1, column: 1 });
        editor.focus();
        hasEdited = false;
    };

    // ----- sync scroll position -----

    let initScrollBarSync = (settings) => {
        let checkbox = document.querySelector('#sync-scroll-checkbox');
        checkbox.checked = settings;
        scrollBarSync = settings;

        checkbox.addEventListener('change', (event) => {
            let checked = event.currentTarget.checked;
            scrollBarSync = checked;
            saveScrollBarSettings(checked);
        });
    };

    let enableScrollBarSync = () => {
        scrollBarSync = true;
    };

    let disableScrollBarSync = () => {
        scrollBarSync = false;
    };

    // ----- clipboard utils -----

    let copyToClipboard = (text, successHandler, errorHandler) => {
        navigator.clipboard.writeText(text).then(
            () => {
                successHandler();
            },

            () => {
                errorHandler();
            }
        );
    };

    let notifyCopied = () => {
        let labelElement = document.querySelector("#copy-button a");
        labelElement.innerHTML = "Copied!";
        setTimeout(() => {
            labelElement.innerHTML = "Copy";
        }, 1000)
    };

    let notifyPreview = () => {
        let labelElement = document.querySelector("#preview-button a");
        labelElement.innerHTML = "Previewing!";
        setTimeout(() => {
            labelElement.innerHTML = "Preview Now";
        }, 1000)
    };

    let switchView = () => {
        let labelElement = document.querySelector("#switch-view-button a");
        if (labelElement.innerHTML === "View switch: landscape") {
            labelElement.innerHTML = "View switch: portrait";
        } else {
            labelElement.innerHTML = "View switch: landscape";
        }
    };

    // ----- setup -----

    // setup navigation actions
    let setupResetButton = () => {
        document.querySelector("#reset-button").addEventListener('click', (event) => {
            event.preventDefault();
            reset();
        });
    };
    
    let getDateTimeString = () => {
        const now = new Date();

        const pad = (n) => n.toString().padStart(2, '0');

        const year = now.getFullYear().toString().slice(-2); // YY
        const month = pad(now.getMonth() + 1);               // MM (0-based)
        const day = pad(now.getDate());                      // DD
        const hours = pad(now.getHours());                   // HH
        const minutes = pad(now.getMinutes());               // MM

    return `${year}${month}${day}_${hours}${minutes}`;
    }
  
    let setupPreviewButton = (editor) => {
        let labelElement = document.querySelector("#switch-view-button a");
        document.querySelector("#preview-button").addEventListener('click', (event) => {
            event.preventDefault();
            const content = document.getElementById('output').innerHTML; // or any part you want to clone
            const dateString = getTitleName(editor);
            //const viewMode = labelElement.innerHTML.replace("View switch: ","");
            const viewMode = "portrait";
            let tableFontSize = "10px";
            let newWindowWidth = "810px";
            const html = generatePDFHtml(dateString, viewMode, tableFontSize, content);
        
            const settingStr = `width=${newWindowWidth},height=auto`
            const newWindow = window.open('', '_blank', settingStr); // Set desired width and height
            if (newWindow) {
                //newWindow.open()
                newWindow.document.writeln(html);
                //alert(html);
                newWindow.document.close();    
            } else {
                alert("Popup blocked. Please allow popups for this site.");
            }
            
        });
    };

    let setupLPreviewButton = (editor) => {
        let labelElement = document.querySelector("#switch-view-button a");
        document.querySelector("#l-preview-button").addEventListener('click', (event) => {
            event.preventDefault();
            const content = document.getElementById('output').innerHTML; // or any part you want to clone
            const dateString = getTitleName(editor);
            //const viewMode = labelElement.innerHTML.replace("View switch: ","");
            const viewMode = "landscape";
            // landscape
            let tableFontSize = "12px";
            let newWindowWidth = "1150px";
            const html = generatePDFHtml(dateString, viewMode, tableFontSize, content);
        
            const settingStr = `width=${newWindowWidth},height=auto`
            const newWindow = window.open('', '_blank', settingStr); // Set desired width and height
            if (newWindow) {
                //newWindow.open()
                newWindow.document.writeln(html);
                //alert(html);
                newWindow.document.close();    
            } else {
                alert("Popup blocked. Please allow popups for this site.");
            }
            
        });
    };

    let generatePDFHtml = (dateString, viewMode, tableFontSize, content) => {
            return `
<!DOCTYPE html>
<html>
<head>
    <title>${dateString}</title>
    <script src="./js/paged.polyfill.js"></script>
    <style>
        @media print,screen {
            @page {
                size: A4 ${viewMode};
                margin-top: 2.8cm;
                margin-left: 1.8cm;
                margin-right: 1.8cm;
                margin-bottom: 2.2cm;
                padding-top: 15px;

                @top-left {
                    width: 200px;
                    content: " " url("./image/header.svg");
                    vertical-align: bottom;
                }
                @bottom-right {
                    padding-top:20px;
                    padding-right:22px;
                    font-size: 8pt;
                    content: "© Elytone 2025 V2";
                    vertical-align: top;
                    display: inline-block;
                    width: 120px;
                    height: 120px;
                    background-image: url("./image/footer.svg");
                    background-repeat: no-repeat;
                    background-size: 120px;               
                }
                @bottom-left {
                    padding-top:20px;
                    font-style: "Noto Sans";
                    font-size: 8pt;
                    content: "Page " counter(page) " of " counter(pages);
                    vertical-align: top;
                }

            }
            @page:nth(1) {
                padding-top: 0;
            }

            body, p { 
                font-family: "Noto Sans TC", sans-serif;
                -webkit-print-color-adjust:exact !important;
                print-color-adjust:exact !important;
                font-size: 12px;
                margin-top: 0;
                margin-bottom: 8px;
            }

            img {
                max-width: 100%;
                max-height: 100%;
            }

            .headerleft {
                position:running(topLeft);
            }
            
            .footerright {
                position:running(bottomRight);
                page-break-before: always;
            }
            
            .serif,
            .sansserif,
            .monospace{
              font-family: "Noto Sans TC", sans-serif;
            }
            
            hr {
               page-break-after: always;
               color:rgb(255, 255, 255);
               scale: 0;
            }

            h1 {
                margin-top: 15px;
                margin-bottom: 24px;
                padding-bottom: .3em;
                font-size: 2em;
                font-weight: 200;
                line-height: 1;
                color: #F79646;
            }
            
            h2 {
                margin-top: 15px;
                margin-bottom: 20px;
                font-size: 1.4em;
                font-weight: 400;
                line-height: 1;
                color: #F79646;
            }
            
            h3 {
                margin-top: 15px;
                margin-bottom: 8px;
                font-size: 1.2em;
                font-weight: 600;
                line-height: 1;
                color:rgb(0, 0, 0);
            }
            h4 {
                margin-top: 15px;
                margin-bottom: 8px;
                font-size: 1.2em;
                font-weight: 400;
                line-height: 1;
                color:rgb(0, 0, 0);
            }
            h5 {
                margin-top: 15px;
                margin-bottom: 8px;
                font-size: 0.8em;
                font-weight: 600;
                line-height: 1;
                color:rgb(0, 0, 0);
            }
            h6 {
                margin-top: 15px;
                margin-bottom: 8px;
                font-size: 0.8em;
                font-weight: 400;
                font-style: italic;
                line-height: 1;
                color:rgb(0, 0, 0);
            }

            table th {
                font-weight: 400;
            }
            
            table th,
            table td {
                padding: 6px 13px;
                border: 1px solid #d0d7de;
            }

            table td>:last-child {
            margin-bottom: 0;
            }

            table tr {
            background-color: #ffffff;
            border-top: 1px solid #d0d7deb3;
            }

            table tr:nth-child(2n) {
                background-color: #f6f8fa;
            }

            table img {
                background-color: transparent;
            }

            hr::before {
                display: table;
                content: "";
            }

            hr::after {
                display: table;
                clear: both;
                content: "";
            }

            table {
                font-size:${tableFontSize};
                white-space: nowrap;
                border-spacing: 0;
                border-collapse: collapse;
                display: block;
                width: 100%;
                max-width: 100%;
                overflow: auto;
            }
            
            table th {
               font-weight: 600;
            }

            pre {
                padding: 16px;
                overflow: auto;
                font-size: 85%;
                line-height: 1.45;
                color: #1f2328;
                background-color: #f6f8fa;
                border-radius: 6px;
            }
            pre code {
                display: inline;
                max-width: auto;
                padding: 0;
                margin: 0;
                overflow: visible;
                line-height: inherit;
                word-wrap: normal;
                background-color: transparent;
                border: 0;
                font-weight: 500;
            }

            code,
            kbd,
            pre,
            samp {
                font-size: 1em;
            }

            tt,
            code,
            samp {
                font-size: 1em;
            }

            code,
            tt {
                padding: .2em .4em;
                margin: 0;
                font-size: 1em;
                font-weight: 500;
                white-space: break-spaces;
                background-color: #afb8c133;
                border-radius: 6px;
                font-family: "Noto Sans TC", sans-serif;
                line-height: 1.9;
            }

            code br,
            tt br {
                display: none;
            }

        }   
        </style>    
    </head>
    <div id="header" style="font-size:8pt; font-style: "Noto Sans"">
             Elytone Electronic Co., Ltd<br>  No. 218, Section 2, Zhongzheng Rd, Sanxia District, New Taipei City, 23742 Taiwan
    </div> 
    <body>
            <div class="content">
                ${content}
            </div>
    </body>
    </html>
`;
    }

    let setupCopyButton = (editor) => {
        document.querySelector("#copy-button").addEventListener('click', (event) => {
            event.preventDefault();
            let value = editor.getValue();
            copyToClipboard(value, () => {
                notifyCopied();
            },
                () => {
                    // nothing to do
                });
        });
    };


    let getTitleName = (editor) => {
        let value = editor.getValue();

        // Extract the first non-empty line
        const firstLine = value.split('\n').find(line => line.trim().length > 0) || 'untitled';
        const baseTitle = firstLine.replace(/[#*\[\]()`~]/g, '').trim().slice(0, 50); // Clean and limit

        // Format current date
        const now = new Date();
        const year = now.getFullYear();
        const month = now.toLocaleString('en-US', { month: 'short' }); // "Jun", "Jul", etc.
        const day = String(now.getDate()).padStart(2, '0');
        const dateStr = `${year} ${month} ${day}`;

        // Default filename suggestion
        const defaultFilename = `${baseTitle} - ${dateStr}`;
        return defaultFilename;
    }

    let setupExportButton = (editor) => {
        document.querySelector("#export-button").addEventListener('click', (event) => {
            event.preventDefault();
            let value = editor.getValue();

            const defaultFilename = getTitleName(editor);
            // Ask for custom filename (you can replace prompt with a text input in UI if needed)
            let filename = prompt("Enter file name:", defaultFilename);
            if (!filename) return; // Cancelled
            
            // Create a blob with the editor value
            let blob = new Blob([value], { type: 'text/plain' });
            
            // Create a temporary download link
            let a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = filename.endsWith('.md') ? filename : `${filename}.md`;
            document.body.appendChild(a);
            a.click();
            
            // Clean up
            document.body.removeChild(a);
            URL.revokeObjectURL(a.href);
        });
    };
    
    let setupImportButton = (editor) => {
        const fileInput = document.querySelector("#import-file");
        const importButton = document.querySelector("#import-button");

        importButton.addEventListener('click', (event) => {
            event.preventDefault();
            fileInput.click(); // Trigger hidden file input
        });

        fileInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function(e) {
                const content = e.target.result;
                editor.setValue(content); // Replace editor content with file content
            };
            reader.readAsText(file);
        });
    };

    let setupImageUploadButton = (editor) => {
        const imageInput = document.querySelector("#upload-image");
        const imageButton = document.querySelector("#upload-image-button");
        const imgbbApiKey = 'a4d9801643097efbb1d2f64708cac602';

        // Create overlay loader
        const overlay = document.createElement('div');
        overlay.innerHTML = `
            <div style="
                position: fixed;
                top: 0; left: 0;
                width: 100vw; height: 100vh;
                background: rgba(0, 0, 0, 0.5);
                z-index: 9999;
                display: flex;
                align-items: center;
                justify-content: center;
            ">
                <img src="https://i.pinimg.com/originals/f8/f9/c1/f8f9c18d14f4affd79c09017591e096f.gif" alt="Loading..." style="width: 200px; height: 150px; border-radius: 20px; background: #FFFFFF;" />
            </div>
        `;
        overlay.style.display = 'none';
        document.body.appendChild(overlay);

        const showOverlay = () => { overlay.style.display = 'flex'; };
        const hideOverlay = () => { overlay.style.display = 'none'; };

        imageButton.addEventListener('click', (event) => {
            event.preventDefault();
            imageInput.click();
        });

        imageInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (!file || !file.type.startsWith('image/')) {
                alert('Please select a valid image file.');
                return;
            }

            const reader = new FileReader();
            reader.onload = async function(e) {
                const base64Data = e.target.result.split(',')[1];

                try {
                    showOverlay();

                    const formData = new FormData();
                    formData.append('key', imgbbApiKey);
                    formData.append('image', base64Data);

                    const response = await fetch('https://api.imgbb.com/1/upload', {
                        method: 'POST',
                        body: formData
                    });

                    const result = await response.json();

                    if (!result.success) {
                        throw new Error('Upload failed');
                    }

                    const imageUrl = result.data.url;
                    //const markdownImage = `![${file.name}](${imageUrl})`;
                    const markdownImage = `<img src="${imageUrl}" alt="${file.name}" width="auto">`;

                    const selection = editor.getSelection();
                    const insertOp = {
                        range: selection,
                        text: markdownImage,
                        forceMoveMarkers: true
                    };

                    editor.executeEdits("insert-image", [insertOp]);

                    const endPosition = selection.getEndPosition();
                    const newPosition = {
                        lineNumber: endPosition.lineNumber,
                        column: endPosition.column + markdownImage.length
                    };
                    editor.setPosition(newPosition);
                    editor.focus();

                } catch (err) {
                    console.error('Image upload failed:', err);
                    alert('Failed to upload image. Please try again.');
                } finally {
                    hideOverlay();
                }
            };

            reader.readAsDataURL(file);
        });
    };
    
    let setupImageAddButton = (editor) => {
        const imageInput = document.querySelector("#add-image");
        const imageButton = document.querySelector("#add-image-button");

        imageButton.addEventListener('click', (event) => {
            event.preventDefault();
            imageInput.click(); // Trigger hidden file input
        });

        imageInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (!file || !file.type.startsWith('image/')) {
                alert('Please select a valid image file.');
                return;
            }

            const reader = new FileReader();
            reader.onload = function(e) {
                const base64Data = e.target.result;
                // Prepare the full block with region comments around the image markdown
                /*
                const markdownBlock = [
                    '<!-- #start of image raw -->',
                    `![${file.name}](${base64Data})`,
                    '<!-- #end of image raw -->'
                ].join('\n');
                */

                const markdownBlock = [
                    '<!-- #start of image raw -->',
                    `<div style="text-align:center"><img width="auto" title="${file.name}" src="${base64Data}`,
                    `"/></div>`,
                    '<!-- #end of image raw -->'
                ].join('\n');

                const selection = editor.getSelection();

                const insertOp = {
                    range: selection,
                    text: markdownBlock,
                    forceMoveMarkers: true
                };

                editor.executeEdits("insert-image", [insertOp]);

                // Move cursor to after inserted block
                const endPosition = selection.getEndPosition();
                // Because we inserted 3 lines, move lineNumber by 3 and set column to 1 (start of next line)
                const newPosition = {
                    lineNumber: endPosition.lineNumber + 3,
                    column: 1
                };
                editor.setPosition(newPosition);
                editor.focus();
            };
            reader.readAsDataURL(file);
        });
    };

    let setupMeetingNoteTemplateButton = (editor, defaultInput, confirmationMessage = "Replace current content with the meeting template?") => {
        const templateButton = document.querySelector("#meeting-note-template-button"); // Button to insert template

        templateButton.addEventListener('click', (event) => {
            event.preventDefault();

            let changed = editor.getValue() !== defaultInput;
            if (changed) {
                let confirmed = window.confirm(confirmationMessage);
                if (!confirmed) return;
            }

            const template = `# Meeting Title, Location
* **Date : DD MMM, YYYY**
* **Time: HHMM - HHMM**

## Attendees
* Name Title (Optional) - Company
* Name Title (Optional) - Company

## Meeting Notes
### Sub topic1
* Item1 descreiption
* Item2 descreiption
    * Subitem1 of item2 description...
    * Subitem2 of item2 description...

\`highlight text\`
**blod text**

### Sub topic2
1. Item1
    1. Item 1-1
2. Item2
    1. Item 2-1
    2. Item 2-2

## Action Items
- [X] Name - things to do
- [ ] Name - another things to do`;

            editor.setValue(template);

            
            // Optional UI refresh logic (e.g. scroll or re-render preview pane)
            /*
            document.querySelectorAll('.column').forEach((element) => {
                element.scrollTo({ top: 0 });
            });

            // Optional: auto-render if using preview pane
            const preview = document.querySelector("#preview");
            if (preview && typeof marked !== 'undefined') {
                preview.innerHTML = marked.parse(template);
            }*/
        });
    };

    // ----- local state -----

    let loadLastContent = () => {
        let lastContent = Storehouse.getItem(localStorageNamespace, localStorageKey);
        return lastContent;
    };

    let saveLastContent = (content) => {
        let expiredAt = new Date(2099, 1, 1);
        Storehouse.setItem(localStorageNamespace, localStorageKey, content, expiredAt);
    };

    let loadScrollBarSettings = () => {
        let lastContent = Storehouse.getItem(localStorageNamespace, localStorageScrollBarKey);
        return lastContent;
    };

    let saveScrollBarSettings = (settings) => {
        let expiredAt = new Date(2099, 1, 1);
        Storehouse.setItem(localStorageNamespace, localStorageScrollBarKey, settings, expiredAt);
    };

    let setupDivider = () => {
        let lastLeftRatio = 0.5;
        const divider = document.getElementById('split-divider');
        const leftPane = document.getElementById('edit');
        const rightPane = document.getElementById('preview');
        const container = document.getElementById('container');

        let isDragging = false;

        divider.addEventListener('mouseenter', () => {
            divider.classList.add('hover');
        });

        divider.addEventListener('mouseleave', () => {
            if (!isDragging) {
                divider.classList.remove('hover');
            }
        });

        divider.addEventListener('mousedown', () => {
            isDragging = true;
            divider.classList.add('active');
            document.body.style.cursor = 'col-resize';
        });

        divider.addEventListener('dblclick', () => {
            const containerRect = container.getBoundingClientRect();
            const totalWidth = containerRect.width;
            const dividerWidth = divider.offsetWidth;
            const halfWidth = (totalWidth - dividerWidth) / 2;

            leftPane.style.width = halfWidth + 'px';
            rightPane.style.width = halfWidth + 'px';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            document.body.style.userSelect = 'none';
            const containerRect = container.getBoundingClientRect();
            const totalWidth = containerRect.width;
            const offsetX = e.clientX - containerRect.left;
            const dividerWidth = divider.offsetWidth;

            // Prevent overlap or out-of-bounds
            const minWidth = 100;
            const maxWidth = totalWidth - minWidth - dividerWidth;
            const leftWidth = Math.max(minWidth, Math.min(offsetX, maxWidth));
            leftPane.style.width = leftWidth + 'px';
            rightPane.style.width = (totalWidth - leftWidth - dividerWidth) + 'px';
            lastLeftRatio = leftWidth / (totalWidth - dividerWidth);
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                divider.classList.remove('active');
                divider.classList.remove('hover');
                document.body.style.cursor = 'default';
                document.body.style.userSelect = '';
            }
        });

        window.addEventListener('resize', () => {
            const containerRect = container.getBoundingClientRect();
            const totalWidth = containerRect.width;
            const dividerWidth = divider.offsetWidth;
            const availableWidth = totalWidth - dividerWidth;

            const newLeft = availableWidth * lastLeftRatio;
            const newRight = availableWidth * (1 - lastLeftRatio);

            leftPane.style.width = newLeft + 'px';
            rightPane.style.width = newRight + 'px';
        });
    };

    // ----- entry point -----
    let lastContent = loadLastContent();
    let editor = setupEditor();
    if (lastContent) {
        presetValue(lastContent);
    } else {
        presetValue(defaultInput);
    }
    setupResetButton();
    setupCopyButton(editor);
    setupExportButton(editor);
    setupImportButton(editor);
    setupMeetingNoteTemplateButton(editor);
    setupImageUploadButton(editor);
    setupImageAddButton(editor);
    setupPreviewButton(editor);
    setupLPreviewButton(editor);


    let scrollBarSettings = loadScrollBarSettings() || false;
    initScrollBarSync(scrollBarSettings);

    setupDivider();
};
 

window.addEventListener("load", () => {
    init();
});
