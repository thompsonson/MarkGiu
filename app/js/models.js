var markgiu = markgiu || {};


markgiu.fs = require('fs');
markgiu.converter = new Showdown.converter({ extensions: ['github', 'wikilink', 'table'] });

        
markgiu.DocumentPanel = function(options){
    
    var options = options || {};
    var self = this;
    var parent = options.parent;

    self.id = options.id;
    self.content = ko.observable(options.content||'');
    self.label = ko.observable(options.label || '');
    self.initialContent = options.content||'';

    self.editor = null;
    self.element = null;
    self.rootElement = null;
    self.previewElement = null;
    
    self.filepath = ko.observable(options.filepath || '');
    self.dirty = ko.observable(options.dirty || false);

    if (self.label() == ''){
        bootbox.prompt("Label Name", function(result) {
            if (result === null) {
               self.label('untiled' + self.id);
            } else {
                self.label(result);
            }
        });
    }
    
    self.convertedContent = ko.computed(function(){
        var content = self.content();
        if (content){
            var cnt = markgiu.converter.makeHtml(content);
            return cnt;
        }
        return null;     
    }, this);
    
    self.addLinksBehaviour = function(createCallback, openCallback){
    
        $("a.wikilink", self.previewElement).unbind().click(function(e){
            var href=$(this).attr("href");

            // TODO: search though current tabs for Label == href
            console.log(parent.db().filter({label: href}).stringify());
            console.log(parent.db().get());
            var data = parent.tabs();
            console.log("-------------");
            console.log(data[0]);
            for (i = 0; i < data.length; i++) { 
                if (data[i]().Label == 'href'){
                    console.log(data[i]());
                }
            }
            console.log("-------------");
            console.log(parent.filterTabs({label: href}));
            // if present call openCallback(path);
            // if not present call createCallback(path);

            return false;
        });
    
    };
    

    self.cancelLinksBehaviour = function(){
        $("a.wikilink", self.previewElement).unbind();
    };
  
  
    self.activateEditor = function(element){

        self.editor = ace.edit(element);
        self.element = element;
        self.editor.setTheme("ace/theme/twilight");
        self.editor.getSession().setMode("ace/mode/markdown");
        if(self.content()){
            self.editor.setValue(self.content());
            self.editor.clearSelection();
        }
        
        self.rootElement = $("#"+self.id);
        self.previewElement = $(".editor-preview .edit", self.rootElement);
        
        self.editor.on("change", function(){
            var content = self.editor.getValue();
            self.content(content);
            self.dirty(true);
        });    

        self.editor.focus();
        
    };    
      
        
    self.checkDirty = function(){
        var ct = self.editor.getValue();
        if(ct == self.initialContent){
            self.dirty(false);
        } else {
            if (parent.saveFile()){
                self.dirty(false);
                self.initialContent = self.content();
            } else{
                // TODO: alert failure to save...
            }
        }
    };
        
    self.destroy = function(){
        //console.log("destroy");
    };
    
    self.toggleFullPreview = function() {
        $('#' + self.id).toggleClass("full-preview");
        $('#' + self.id + ' .editor textarea').focus();
    };

    self.toggleFullMarkup = function() {
        $('#' + self.id).toggleClass("full-markup");
        $('#' + self.id + ' .editor textarea').focus();
    };

};



markgiu.AppGui = function(){

    var self = this;
    self.tabs = ko.observableArray();
    self.tabsDict = {};
    self.currentTab = ko.observable(null);
    self.dirtyHandler = null;
    self.nextIdx = 0;
    self.projectFilePath = "";
    self.db = ko.observable();

    self.db(ko.search.setData(self.tabs()));  
    console.log("Testing search");
    //console.log(self.db().get());
    
    self.getNewIdx = function(){
        self.nextIdx += 1;
        return self.nextIdx;
    };
    
    self.addTab = function(options){
        var options = options || {};
        
        var idx = self.getNewIdx();
        idx = idx.toString();
        
        var tab = new markgiu.DocumentPanel({
            id : idx,
            content:options.content,
            label: options.label,
            filepath:options.filepath,
            dirty:options.dirty||false,
            parent: self });
        
        //console.log(tab()()); 

        self.tabsDict[idx] = tab;
        self.tabs.push(tab);
        
        var element = $("#"+idx + " .editor-markup .editor")[0]
        tab.activateEditor(element);
        self.selectTab(tab);         
    };
    
    
    self.addTabNew = function(){
        self.addTab();
    };
    

    self.getCurrentTab = ko.computed(function(){
        var ct = self.currentTab();
        if(ct){
            return self.tabsDict[ct];
        }
        return null;
    });
    
    
    self.closeTab = function(tab){
        tab.checkDirty();
        
        var afterConfirm = function(conf){
            if(!conf){
                return;
            }
            tab.destroy();
            delete self.tabsDict[tab.id];
            
            var newTabs = [];
            for(var x in self.tabsDict){
                if(x != tab.id){
                    newTabs.push(self.tabsDict[x]);
                }
            }
            self.tabs(newTabs);
            
            //set last tab as active
            if(newTabs.length){
                self.selectTab(newTabs[newTabs.length-1]());
            }
            
        };
        
        if(tab.dirty()){
            bootbox.confirm("Content changed, really close?", afterConfirm);
        } else {
            afterConfirm(true);
        };
        
    };
    
    
    self.currentTabChange = function(tab){
        tab.addLinksBehaviour(
            function(path){
                self.addTab({label:path, dirty:false});
            },
            function(path){
                self.openFile(path);
            }
        );
    };
    
    
    self.selectTab = function(tab){
        var ct = self.getCurrentTab()
        if(ct){
            ct.cancelLinksBehaviour();
        }

        if (self.sub){
            self.sub.dispose();
        }
    
        if(self.dirtyHandler){
            clearInterval(self.dirtyHandler);
        }

        self.currentTab(tab.id);        
        tab.editor.resize();
        
        self.currentTabChange(tab);   
        self.sub = tab.content.subscribe(function(newVal){
            self.currentTabChange(tab); 
        });
        
        self.dirtyHandler = setInterval(function(){
            tab.checkDirty();
        }, 1000);     
    };
    
    
    self.bindChoosers = function(cname, sname) {
        var chooser = $(cname);
        self.chooser = chooser;    
        self.chooser.change(function(evt) {
            var path = $(this).val();
            if(!path){
                return;
            }
            self.openFile(path);
            self.chooser.val(null);
        });
        
        var schooser = $(sname);
        self.saveChooser = schooser;    
        self.saveChooser.change(function(evt) {
            var path = $(this).val();
            if(!path){
                return;
            }
            self.saveFileAs(path);
            self.saveChooser.val(null);
        });
    };
    
    
    self.chooseFileToOpen = function(){
        self.chooser.trigger('click');
    };
    
    
    self.chooseFileToSaveAs = function(){
        self.saveChooser.trigger('click');
    };
    
       
    self.openFile = function(path){
        self.projectFilePath = path;
        markgiu.fs.readFile(path, 'utf8', function (err,data) {
            if (err) {
                return console.log(err);
            }
            
            //Check for valid json.
            try {
                var json = JSON.parse( data );
                for (i = 0; i < json.length; i++) { 
                    self.addTab({content: json[i].content, label: json[i].label, filepath: ""});
                };
            } catch (e) {
                var json = null;
                // TODO: alert it's not valid.
            }
            //self.addTab({content:data, filepath:path});
            console.log("updating search db");
            self.db(ko.search.setData(self.tabs()));  
            console.log("Testing search - return observable");
            console.log(self.db().get());
            console.log("Testing search - return array");
            try {
                console.log(self.db().get(true));    
            } catch (e) {
                console.log("failed to return array");
            }
            
            // 

        });
    };
    
    
    self.saveFileAs = function(path){
        self.projectFilePath = path;
        self.saveFile();    
    };  

    self.saveFile = function() {
        // TODO: check the file exists
        // projectFilePath
        var data_to_save = [];
        var data = self.tabs();
        for (i = 0; i < data.length; i++) { 
            data_to_save.push({
                label: data[i]().label(),
                content: data[i]().content()
            })
        }


        //Convert the array to a json buffer.
        var dataBuffer = JSON.stringify( data_to_save );

        //Write it to disk.
        markgiu.fs.writeFile( self.projectFilePath, dataBuffer, function(err){
            if (err) {
                alert("There was an error saving your file to " + self.projectFilePath );
            }
        } );

        // return success or failure
        return true;
    };  

    self.filterTabs = function(filter){
        console.log("filter: " + JSON.stringify( filter ) );
        console.log(self.db().filter(filter).stringify());
        console.log(self.db().get());
    }
    
};
