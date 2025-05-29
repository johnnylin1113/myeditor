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
* Item 3a
* Item 3b

### Ordered

1. Item 1
2. Item 2
3. Item 3
1. Item 3a
2. Item 3b

## Images

![This is an alt text.](image/sample.webp "This is a sample image.")

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
            folding: false
        });

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
            labelElement.innerHTML = "Preview in";
        }, 1000)
    };

    let switchView = () => {
        let labelElement = document.querySelector("#switch-view-button a");
        if (labelElement.innerHTML === "landscape") {
            labelElement.innerHTML = "portrait";
        } else {
            labelElement.innerHTML = "landscape";
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
  
    let setupPreviewButton = () => {
        let labelElement = document.querySelector("#switch-view-button a");
        document.querySelector("#preview-button").addEventListener('click', (event) => {
            event.preventDefault();
            notifyPreview();
            const content = document.getElementById('output').innerHTML; // or any part you want to clone
            const dateString = getDateTimeString();
            const viewMode = labelElement.innerHTML;
            let tableFontSize = "0.7em";
            let newWindowWidth = "1150px";
            if (viewMode === "portrait") {
                tableFontSize = "0.3em";
                newWindowWidth = "810px";
            }
            const html = `
<!DOCTYPE html>
<html>
<head>
    <title>PDF_${dateString}</title>
    <script src="./js/paged.polyfill.js"></script>
    <style>
        @media print,screen {
            @page {
                size: A4 ${viewMode};
                margin-top: 2.8cm;
                margin-left: 1.8cm;
                margin-right: 1.8cm;
                margin-bottom: 1.6cm;
                @top-left {
                    width: 200px;
                    content: " " url("./image/header.svg");
                    vertical-align: bottom;
                }
                @bottom-right {
                    content: "Elytone 2025";
                    content: " " url("./image/footer.svg");
                }
                @bottom-left {
                    content: "Page " counter(page) " of " counter(pages);
                    font-size: 9pt;
                    "Noto Sans","Noto Sans TC";
                    vertical-align: top;
                }

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
              font-family: "Noto Sans","Noto Sans TC";
            }
            
            hr {
               page-break-after: always;
               color:rgb(255, 255, 255);
               scale: 0;
            }

            h1 {
                margin-top: 24px;
                margin-bottom: 16px;
                font-weight: 300;
                line-height: 1.25;
                color: #F79646;
            }
            
            h2 {
                margin-top: 24px;
                margin-bottom: 16px;
                font-weight: 500;
                line-height: 1.25;
                color: #F79646;
            }
            
            h3,
            h4,
            h5,
            h6 {
                margin-top: 24px;
                margin-bottom: 16px;
                font-weight: 500;
                line-height: 1.25;
                color:rgb(0, 0, 0);
            }

            table th {
            font-weight: 400;
            }

            body { 
                font-family: "Noto Sans","Noto Sans TC",-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji";
                -webkit-print-color-adjust:exact !important;
                print-color-adjust:exact !important;
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

            code,
            kbd,
            pre,
            samp {
            font-size: 1em;
            }
            tt,
            code,
            samp {
            font-size: 12px;
            }

            code,
            tt {
            padding: .2em .4em;
            margin: 0;
            font-size: 100%;
            white-space: break-spaces;
            background-color: #afb8c133;
            border-radius: 6px;
            }

            code br,
            tt br {
            display: none;
            }

        }   
        </style>    
    </head>
    <div id="header" style="font-size:9pt">
             Elytone Electronic Co., Ltd<br>  No. 218, Section 2, Zhongzheng Rd, Sanxia District, New Taipei City, 23742 Taiwan
    </div> 
    <body>
            <div class="content">
                ${content}
            </div>
    </body>
    </html>
`;
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

    let setupViewButton = () => {
        document.querySelector("#switch-view-button").addEventListener('click', (event) => {
            event.preventDefault();
            switchView();
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
    setupPreviewButton();
    setupViewButton();

    let scrollBarSettings = loadScrollBarSettings() || false;
    initScrollBarSync(scrollBarSettings);

    setupDivider();
};
 

window.addEventListener("load", () => {
    init();
});
