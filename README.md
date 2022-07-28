# vscode-snippets-viewer
Snippets Viewer for Visual Studio Code
[Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=shilim.vscode-snippets-viewer)

## Auto Loading Snippets From Expansion
You can easily view all extended code snippets from the sidebar<br/>

**GroupByPlugins**

![list1](img/doc1.png)

**GroupByLanguage**

![list2](img/doc2.png)

## Usage
### Insert Snippets
Click code snippet
### Change GroupByType
Click the refresh button in the upper right corner
### Refresh List
Click the 'Group By xxx' button in the upper right corner<br/>
Update `User Settings` to config

#### Disable/Enable Custom Snippets
Only support for custom snippets

![disableSnippets](./img/disableSnippets.gif)
## Options
The following Visual Studio Code setting is available for the Snippets-Viewer. This can be set in `User Settings` or `Workspace Settings`.

```javascript
{
    // custom snippet folder url
    "SnippetViewer.customUrl":"E:\\snippets",
    // groupByType default:'plugins'
    "SnippetViewer.groupByType":"plugins"
    // control the visibility of the 'targetToFile' button default:false
    "SnippetViewer.showTargetCodeBtn":false
}
```
#### Custom Snippets
Snippets code folder template. You can refer to the `snippets` folder
```
snippets                          
├─ custom    
│  └─ vue.json
│  └─ javacript.json                 
└─ config.json               
```
config.json template
```json
[
  {
    "name": "custom",
    "children": [
      {
        "name": "vue",
        "children": "custom/vue.json"
      }
    ]
  }
]
```

#### Target To Snippets File
When SnippetViewer.showTargetCodeBtn is True, you can get a button to open the snippets file.

![targetToFile](./img/targetToFile.gif)