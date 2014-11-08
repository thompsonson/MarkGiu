console.log("Loading PunchDB.js");
// Class declarations
// Basic Unit
function Document(args) {
    this._id = args._id || new Date().toISOString();
    this._rev = args.rev;
}
 
// Basic Collection declaration
function Collection(options){
    // Database connection
    this.db = new PouchDB(options.db || './db');
    // Data Array
    this.DataArray = ko.observableArray();
    // viewable format
    //this.toJson = ko.computed(this.toJson, this);
    this.toJson = ko.observable();
 
    //CurrentDocument details
    this.CurrentDocumentID = ko.observable(null);
    this.CurrentDocumentChange = ko.computed(this.CurrentDocumentChange, this);
    this.CurrentDocument = ko.observable(null);
};
 
// Collection methods
Collection.prototype.add = function(object) {
    that = this;
 
    this.object = object;
    this.nonObservableObj = ko.toJS(object);

    this.db.put(this.nonObservableObj, function callback(err, doc){
        if (!err) {
            console.log('Successfully posted');
            console.log(doc);
            that.DataArray.push(that.object);
            that.toJson(JSON.stringify(ko.toJS(that.DataArray), null, 2));
        } else {
            console.log("error");
            console.log(err);
        }
    });
}

Collection.prototype.put = function(object) {
    that = this;
 
    this.object = object;
    this.nonObservableObj = ko.toJS(object);

    this.db.put(this.nonObservableObj, this.nonObservableObj._id, this.nonObservableObj._rev, function callback(err, doc){
        if (!err) {
            console.log('Successfully updated');
            that.toJson(JSON.stringify(ko.toJS(that.DataArray), null, 2));
        } else {
            console.log("error");
            console.log(err);
        }
    });
}
  
Collection.prototype.getAll = function() {
    that = this;
               
    this.db.allDocs({include_docs: true, descending: true}, function(err, doc) {
        if (!err) {
            doc.rows.forEach(function(row) {
                //console.log(row.doc);
                var doc = new Document(row.doc._id);
                // for each key in row.doc add to doc...
                for (var key in row.doc) {
                    if (ko.isObservable(doc[key])){
                        //console.log("processing observable: " + key);
                        doc[key](row.doc[key]);
                    } else {
                        //console.log("processing key: " + key);
                        doc[key] = row.doc[key];
                    }
                }
                that.DataArray.push(doc);
            });
            that.toJson(JSON.stringify(ko.toJS(that.DataArray), null, 2));
        } else {
            console.log("error");
            console.log(err);
        }
    });
}

// Computed methods 
Collection.prototype.toJson = function() {       
    return JSON.stringify(ko.toJS(this.DataArray, null, 2));  
}

Collection.prototype.CurrentDocumentChange = function() {
    that = this;
    console.log(this.CurrentDocumentID());
    if (this.CurrentDocumentID() == null) {
        console.log("no current document id");
        return null;
    } else {
        console.log("there is a current document id");
        //get the document
        this.db.get(this.CurrentDocumentID(),function(err,doc){
            if (!err) {
                console.log(doc);
                var newdoc = new Document(doc)
                for (var key in doc) {
                    if (ko.isObservable(doc[key])){
                        //console.log("processing observable: " + key);
                        newdoc[key](doc[key]);
                    } else {
                        //console.log("processing key: " + key);
                        newdoc[key] = doc[key];
                    }
                }
                that.CurrentDocument(newdoc);
            } else {
                console.log("error");
                console.log(err);
            }
        })
    }
    return null;
}
 