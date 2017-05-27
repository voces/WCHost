
class Collection extends Array {

	constructor( ...args ) {

		super( ...args );

		this.key = Collection.defaultKey;
		this.map = {};

	}

	add( item ) {

		this.push( item );

		if ( item[ this.key ] )
			this.map[ item[ this.key ] ] = item;

	}

	remove( item ) {

		const index = this.indexOf( item );
		if ( index ) this.splice( index, 1 );

		//Is the second condition required? How does it effect speed?
		if ( item[ this.key ] && this.map[ item[ this.key ] ] )
			delete this.map[ item[ this.key ] ];

	}

}

Collection.defaultKey = "key";

module.exports = Collection;
