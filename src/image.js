const path = require('path');

module.exports = class Image{
    constructor(name, path, props, index, base64, smol){
        this.name = name;
        this.path = path;
        this.props = props;
        this.index = index;
        this.base64 = base64;
        this.smol = smol;
    }
}