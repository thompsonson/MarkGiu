// from http://www.knockmeout.net/2011/05/creating-smart-dirty-flag-in-knockoutjs.html
ko.dirtyFlag = function(root, isInitiallyDirty) {
    var result = function() {},
        _initialState = ko.observable(ko.mapping.toJSON(root)),
        _isInitiallyDirty = ko.observable(isInitiallyDirty);
 
    result.isDirty = ko.computed(function() {
        return _isInitiallyDirty() || _initialState() !== ko.mapping.toJSON(root);
    });
 
    result.reset = function() {
        _initialState(ko.mapping.toJSON(root));
        _isInitiallyDirty(false);
    };
 
    return result;
};