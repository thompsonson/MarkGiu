var markgiu = markgiu || {};
 
markgiu.converter = new Showdown.converter({ extensions: ['github', 'wikilink', 'table'] });

//ko.mapping.fromJS(options.data, {}, this);
markgiu.myDBCollection2 = ko.mapping.fromJS([
    {db: "private_local3", remoteCouch:"https://thompson.couchappy.com/notes_private", encrypt: true, password: "notes_private", continousSync: true},
    {db: "notes", remoteCouch:"http://shedpi:5984/notes", encrypt: false, password: "", continousSync: true},
    {db: "2", remoteCouch:"https://thompson.couchappy.com/notes2", encrypt: false, password: "", continousSync: true}
]);

markgiu.DBGui = function(){

    console.log(markgiu.myDBCollection2());

    console.log(markgiu.myDBCollection2()[0]);

    var that = this;

    var debugDB = {db: "configDB", remoteCouch:"http://shedpi:5984/config", encrypt: false, password: "", continousSync: true}
    //var configDB = {db: "configDB" } ; // let the rest default to null and false

    this.databases = markgiu.myDBCollection2;

    //populate local copy of DB
    //    this.databases.getAll();
    //this.toJson = ko.observable(this.databases.toJson());

    this.newDB = function(){
        _log.info("new Database called");
    }

    this.showDevTools = function(){
        win.showDevTools() ;
    } 
 
    this.reloadPageSoft = function(){
        win.reload();
    } 

    this.reloadPageHard = function(){
        win.reloadIgnoringCache();
    } 
       
} 

markgiu.AppGui = function(){
 
    var that = this;

    this.selectedDB = ko.observable(markgiu.myDBCollection2()[0]);
    this.model = ko.computed(function() {
        //console.log(that.selectedDB());
        return new Collection(that.selectedDB());
    });

    //this.model = new Collection({db: "new_db", remoteCouch:"http://shedpi:5984/notes"});
    //this.model = new Collection(markgiu.myDBCollection2()[2]);

    //populate local copy of DB
    this.model().getAll();
    this.toJson = ko.observable(this.model().toJson);

    // start syncing
    //this.model().syncDB();
 
    this.showDevTools = function(){
        win.showDevTools() ;
    } 
 
    this.reloadPageSoft = function(){
        win.reload();
    } 

    this.handleSyncStatusClick = function(){
        if (this.model().syncState() == 'Error - Sync Cancelled'){
            this.model().syncDB();
        }
    }
 
    this.reloadPageHard = function(){
        win.reloadIgnoringCache();
    } 

    this.newDoc = function(){
        that.model().new({
            _id: new Date().toISOString(),
            _rev: "",
            Label: new Date().format("Ymd His"),
            Content: ""
        }); 
    }
 
    this.updateDoc = function(){
        that.model().CurrentDocument().update();
    };  
 
    this.selectDoc = function(){
        that.model().CurrentDocument(this.doc);
    }
 
    this.convertedContent = ko.computed(function(){
       if (that.model().CurrentDocument()){
            var content = that.model().CurrentDocument().Content();
 
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