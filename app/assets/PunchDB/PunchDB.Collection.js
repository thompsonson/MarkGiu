console.log("Loading PunchDB Collection");
 
var PunchDB = PunchDB || {};
 
// Basic Collection declaration
function Collection(options){
    var that = this;
 
    this.dbName = ko.observable(options.db || './db')
    this.remoteCouch = ko.observable(options.remoteCouch || null);
 
    // Database connection
    this.db = new PouchDB(this.dbName());
    this.changeVariable = this.MonitorChanges();
    this.syncVariable;
    this.mapping = {
        'doc': {
            create: function(options) {
                return new Document({db: that.db, data: options.data, Collection: that});
            }
        }
    };
   
    // Data
    this.allRows = ko.observableArray();
    this.CurrentDocument = ko.observable(null);
 
    // Process Variables
    this.syncState = ko.observable("starting...");
 
    // extras (maybe not part of PunchDN but rather the applicaiton [TODO])
    this.showDeleted = ko.observable(false);
 
    // Computed Observables
    this.toJson = ko.computed(this.toJson, this);
 
    this.rows = ko.computed(this.rows, this);
};
 
// Collection methods
Collection.prototype.new = function() {
    var doc = {
        data: {
            _id: new Date().toISOString(),
            _rev: "",
            Label: "new doc",
            Content: ""
        },
        db: this.db,
        Collection: this
    }
    console.log(doc);
    var newDoc = new Document(doc);
    this.allRows.push({doc: newDoc});
    newDoc.update();
}

Collection.prototype.addDocToArray = function(obj) {
    var doc = {
        data: obj.doc,
        db: this.db,
        Collection: this
    }
    console.log(doc);
    var newDoc = new Document(doc);
    this.allRows.push({doc: newDoc});
} 

Collection.prototype.getDocFromArrayByID = function(observableArray, id){
    that = this;
 
    var doc = ko.utils.arrayFirst(observableArray(), function(item) {
            //console.log(item);
            return item.doc._id() === id;
        }) || null;

    return doc;
}
// method to get all the documents
Collection.prototype.getAll = function() {
    that = this;
             
    this.db.allDocs({include_docs: true, descending: true}, function(err, doc) {
        if (!err) {
            // map the returned rows to the observable array
            //console.log(doc.rows);
            ko.mapping.fromJS(doc.rows, that.mapping, that.allRows);
        } else {
            console.log("error");
            console.log(err);
        }
    });
}
 
Collection.prototype.onDocumentCreate = function(parentObj, changedObj) {
    console.log("Collection.prototype.onDocumentCreate");
    var collection;
    if (parentObj instanceof Document){
        collection = parentObj.Collection;
        var doc = collection.getDocFromArrayByID(collection.allRows, changedObj.id);
        console.log(ko.mapping.toJS(doc));
    } else if (parentObj instanceof Collection){
        collection = parentObj;
        console.log(" - - - - - - creating a Collection...");
    }
 
 
}
 
Collection.prototype.onDocumentUpdate = function(obj) {
    console.log("Collection.prototype.onDocumentUpdate");
 
    var doc = this.getDocFromArrayByID(this.allRows, obj.id);

    if (doc == null){ // no local copy
        // add the doc to the array
        console.log(" - - add the doc to the array");
        this.addDocToArray(obj);
    } else if (!(doc.doc.dirtyFlag.isDirty()) && (obj.doc._rev > doc.doc._rev())) { // local is clean and remote is newer
        // refresh the array from the DB...
        console.log(" - - refresh the array from the DB...");
    } else if (doc.doc.dirtyFlag.isDirty() && (obj.doc._rev > doc.doc._rev())) { // local is dirty and remote is newer
        // conflict resolution needed...
        console.log(" - - conflict resolution needed...")
    } else if (!(doc.doc.dirtyFlag.isDirty()) && (obj.doc._rev < doc.doc._rev())) { // local is clean and remote is older
        // need to save the local version and\or sync with the remote DB
        console.log(" - - need to save the local version and\or sync with the remote DB");
    } else {    // catch all
        // do nothing
        console.log(" - - do nothing");
    }

}
 
Collection.prototype.onDocumentDelete = function() {
    console.log("Collection.prototype.onDocumentDelete");
}
 
Collection.prototype.onDocumentError = function() {
    console.log("Collection.prototype.onDocumentError");   
}
 
Collection.prototype.MonitorChanges = function() {
    that = this;
 
    var changes = this.db.changes({
        live: true,
        include_docs: true
    });

    changes.on('create', function(obj){ 
        console.log("Collection.prototype.MonitorChanges - Create"); 
        console.log(obj);
    } );
    changes.on('update', function(obj){
        console.log("Collection.prototype.MonitorChanges - Update");
        //console.log(obj);
        if (that instanceof Document){
            that.Collection.onDocumentUpdate(obj);
        } else if (that instanceof Collection){
            that.onDocumentUpdate(obj);
        } 
    } );
    changes.on('delete', function(obj){ console.log("Collection.prototype.MonitorChanges - Delete"); console.log(obj) } );
    changes.on('error' , function(obj){ console.log("Collection.prototype.MonitorChanges - Error"); console.log(obj)  } );
 
    return changes;
}
 
Collection.prototype.syncDB = function() {
    that = this;
    if (this.remoteCouch()){
        this.syncState('syncing');
        var opts = {
            live: true,
            include_docs: true
        };
        this.syncVariable = this.db.sync(this.remoteCouch(), opts)
            .on('change', function (info) {
                // handle change
                //console.log("Collection.prototype.syncDB - Change");
                //console.log(info);
            }).on('complete', function (info) {
                // handle complete
                console.log("Collection.prototype.syncDB - Complete");
                console.log(info);
                that.syncState('Complete');
            }).on('uptodate', function (info) {
                // handle up-to-date
                console.log("Collection.prototype.syncDB - Up to date");
                console.log(info);
                that.syncState('Up To Date');
            }).on('error', function (err) {
                // handle error
                console.log("Collection.prototype.syncDB - Error");
                console.log(err);
                that.syncState('Error');
            });
    } else {
        console.log("no remote Couch defined");
    }
}
 
// Computed methods
// method to help debug
Collection.prototype.toJson = function() {     
    return JSON.stringify(ko.mapping.toJS(this.allRows), null, 2);
}
 
Collection.prototype.rows = function() {
    if(this.showDeleted()) {
        return that.allRows();
    } else {
        return ko.utils.arrayFilter(this.allRows(), function(row) {
            return row.doc.pdb_deleted() != true;
        });
    }
}
 