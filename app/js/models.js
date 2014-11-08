// extend the base document
Document.prototype.Content = "";
Document.prototype.Label = "";

var markgiu = markgiu || {};
markgiu.AppGui = function(){

    var that = this;

    this.model = new Collection({});
    //populate local copy of DB
    this.model.getAll();

    this.toJson = ko.observable(this.model.toJson);

    this.addNote = function(){
        //console.log("addNote called");
        that.model.put(that.model.CurrentDocument());
    };   

    this.selectTab = function(){
        //console.log(this);
        that.model.CurrentDocumentID(this._id);
    }
};
