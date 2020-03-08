# chrome-extensions-list

Exports a list of installed Chrome extensions from a profile to HTML file. Supports some other Chrome-based browsers: Chromium, Brave, etc.

## Installation

### Node (8.6+)

```
npm i -g chrome-extensions-list
```

### Standalone (Windows)

Download the executable from *Releases*. Make sure chrome-extensions-list-x86.exe has read access to profile folder and write access to HTML file location, mark it with *Run this program as an administrator* flag if needed.

## Usage

### Node

Show help:
```
chrome-extensions-list --help
```

Print HTML file contents:
```
chrome-extensions-list --print "C:\Users\Me\AppData\Local\Google\Chrome\User Data\Default"
```

Write HTML file to chrome-extensions-list location:
```
chrome-extensions-list "C:\Users\Me\AppData\Local\Google\Chrome\User Data\Default"
```

Write HTML file to custom location:
```
chrome-extensions-list "F:\Backup\Chrome\User Data\Default" "C:\Users\Me\Desktop\My Chrome extensions.html"
```

### Standalone (Windows)

Same as Node:

```
chrome-extensions-list-x86 [args]
```

Supports drag'n'drop of Chrome profile folder.