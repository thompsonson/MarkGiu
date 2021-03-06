var markgiu = markgiu || {};
 
markgiu.converter = new Showdown.converter({ extensions: ['github', 'wikilink', 'table'] });
 
markgiu.AppGui = function(){
 
    var that = this;

    //this.model = new Collection({db: "new_db", remoteCouch:"http://shedpi:5984/notes"});
    this.model = new Collection({db: "new_db", remoteCouch:"https://thompson.couchappy.com/notes"});
    //populate local copy of DB
    this.model.getAll();
    this.toJson = ko.observable(this.model.toJson);

    // start syncing
    this.model.syncDB();
 
    this.showDevTools = function(){
        win.showDevTools() ;
    } 
 
    this.reloadPageSoft = function(){
        win.reload();
    } 

    this.handleSyncStatusClick = function(){
        if (this.model.syncState() == 'Error - Sync Cancelled'){
            this.model.syncDB();
        }
    }
 
    this.reloadPageHard = function(){
        win.reloadIgnoringCache();
    } 

    this.newDoc = function(){
        that.model.new(); 
    }
 
    this.updateDoc = function(){
        that.model.CurrentDocument().update();
    };  
 
    this.selectDoc = function(){
        that.model.CurrentDocument(this.doc);
    }
 
    this.convertedContent = ko.computed(function(){
       if (that.model.CurrentDocument()){
            var content = that.model.CurrentDocument().Content();
 
            if (content){
                var cnt = markgiu.converter.makeHtml(content);
                //var p = self.filepath();
                //var bp = self.getBasePath(p);
                //cnt = cnt.replace('img src="', 'img src="'+bp);
                return cnt;
            }
        }
      
        return null;    
    }, this);
 
    this.deleteDoc = function(){
        _log.debug("deleting: ", this.doc);
        this.doc.delete();
    }
 
};