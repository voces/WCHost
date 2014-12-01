//////////////////////////////////////////////
//	Constructor + property set/gets
//////////////////////////////////////////////

function ShiftingArray(maxSize) {
	this.maxSize = maxSize;
}

ShiftingArray.prototype = Object.create(Array.prototype);
ShiftingArray.prototype.constructor = ShiftingArray;

ShiftingArray.prototype.push = function() {
	var reduction = this.length + arguments.length - this.maxSize;
	
	
	if (reduction < 0) reduction = 0;
	
	var args = [0, reduction];
	args.push.apply(this, arguments);
	
	this.splice.apply(this, args);
	
	//this.splice(0, reduction, arguments);
	/*Array.apply(this, arguments);
	
	var reduction = this.length - this.maxSize;
	
	if (reduction > 0) {
		this.shift 
	}*/
};

ShiftingArray.prototype.geometricMean = function() {
	var product = this[0];
	
	if (product == null) throw new Error("Empty ShiftingArray");
	
	for (var i = 1; i < this.length; i++)
		product *= this[i];
	
	return Math.pow(product, 1/this.length);
};

//Expose ShiftingArray class
module.exports = ShiftingArray;
