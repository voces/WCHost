
class Collection extends Array {

	constructor( ...args ) {

		super( ...args );

		this.key = Collection.defaultKey;
		this.dict = {};

	}

	add( ...items ) {

		this.push( ...items );

		for ( let i = 0; i < items.length; i ++ )
			if ( items[ i ][ this.key ] )
				this.dict[ items[ i ][ this.key ] ] = items[ i ];

	}

	replace( arr ) {

		this.splice( 0 );
		this.dict = {};

		this.add( ...arr );

	}

	remove( item ) {

		const index = this.indexOf( item );
		if ( index ) this.splice( index, 1 );

		//Is the second condition required? How does it effect speed?
		if ( item[ this.key ] && this.dict[ item[ this.key ] ] )
			delete this.dict[ item[ this.key ] ];

	}

}

Collection.defaultKey = "key";

module.exports = Collection;
