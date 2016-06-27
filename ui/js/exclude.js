/* globals ajaxurl, wp_stream_regenerate_alt_rows */
jQuery( function( $ ) {
	var initSettingsSelect2 = function() {
		var $input_user;

		$( '.stream-exclude-list tr:not(.hidden) select.select2-select.connector_or_context' ).each( function( k, el ) {
			$( el ).select2({
				allowClear: true,
				templateResult : function( item ) {
					if ( typeof item.id === 'undefined' ) {
						return item.text;
					}
					if ( item.id.indexOf( '-' ) === -1 ) {
						return $( '<span class="parent">' + item.text + '</span>' );
					} else {
						return $( '<span class="child">' + item.text + '</span>' );
					}
				},
				matcher: function( params, data ) {
					var match = $.extend( true, {}, data );

					if ( params.term == null || $.trim( params.term ) === '') {
						return match;
					}

					var term = params.term.toLowerCase();

					match.id = match.id.replace( 'blogs', 'sites' );
					if ( match.id.toLowerCase().indexOf( term ) >= 0 ) {
						return match;
					}

					if ( match.children ) {

						for ( var i = match.children.length - 1; i >= 0; i--) {
							var child = match.children[i];

							// Remove term from results if it doesn't match.
							if ( child.id.toLowerCase().indexOf( term ) === -1 ) {
								match.children.splice( i, 1 );
							}
						}

						if ( match.children.length > 0 ) {
							return match;
						}
					}

					return null;
				}
			});
		});

		$( '.stream-exclude-list tr:not(.hidden) select.select2-select.action' ).each( function( k, el ) {
			$( el ).select2({
				allowClear: true
			});
		});

		$( '.stream-exclude-list tr:not(.hidden) select.select2-select.author_or_role' ).each( function( k, el ) {
			$input_user = $( el );

			$input_user.select2({
				ajax: {
					type: 'POST',
					url: ajaxurl,
					dataType: 'json',
					quietMillis: 500,
					data: function( term, page ) {
						return {
							find: term,
							limit: 10,
							pager: page,
							action: 'stream_get_users',
							nonce: $input_user.data( 'nonce' )
						};
					},
					processResults: function( response ) {
						var roles  = [];

						$( 'option', $input_user ).each( function() {
							if ( $( this ).val() === '' ) {
								return;
							}
							roles.push({
								'id' : $( this ).val(),
								'text' : $( this ).text()
							});
						});

						roles = $.grep(
							roles,
							function( role ) {
								var roleVal = $input_user.data( 'select2' ).dropdown.$search
								    .val()
								    .toLowerCase();
								var rolePos = role
								    .text
								    .toLowerCase()
								    .indexOf( roleVal );
								return rolePos >= 0;
							}
						);

						var answer = {
							results: [
								{ text: '', id: '' },
								{ text: 'Roles', children: roles },
								{ text: 'Users', children: [] }
							]
						};

						if ( true !== response.success || undefined === response.data || true !== response.data.status ) {
							return answer;
						}

						$.each( response.data.users, function( k, user ) {
							if ( $.contains( roles, user.id ) ) {
								user.disabled = true;
							}
						});

						answer.results[ 2 ].children = response.data.users;

						// Notice we return the value of more so Select2 knows if more results can be loaded
						return answer;
					}
				},
				formatResult: function( object, container ) {
					var result = object.text;

					if ( 'undefined' !== typeof object.icon && object.icon ) {
						result = '<img src="' + object.icon + '" class="wp-stream-select2-icon">' + result;

						// Add more info to the container
						container.attr( 'title', object.tooltip );
					}

					// Add more info to the container
					if ( 'undefined' !== typeof object.tooltip ) {
						container.attr( 'title', object.tooltip );
					} else if ( 'undefined' !== typeof object.user_count ) {
						container.attr( 'title', object.user_count );
					}

					return result;
				},
				formatSelection: function( object ) {
					if ( $.isNumeric( object.id ) && object.text.indexOf( 'icon-users' ) < 0 ) {
						object.text += '<i class="icon16 icon-users"></i>';
					}

					return object.text;
				},
				allowClear: true,
				placeholder: $input_user.data( 'placeholder' )
			}).on( 'change', function() {
				var value = $( this ).select2( 'data' );

				$( this ).data( 'selected-id', value.id );
				$( this ).data( 'selected-text', value.text );
			});
		});

		$( '.stream-exclude-list tr:not(.hidden) select.select2-select.ip_address' ).each( function( k, el ) {
			var $input_ip  = $( el ),
			    searchTerm = '';

			$input_ip.select2({
				ajax: {
					type: 'POST',
					url: ajaxurl,
					dataType: 'json',
					quietMillis: 500,
					data: function( term ) {
						searchTerm = term.term;
						return {
							find: term,
							limit: 10,
							action: 'stream_get_ips',
							nonce: $input_ip.data( 'nonce' )
						};
					},
					processResults: function( response ) {
						var answer = { results: [] },
							ip_chunks = [];

						if ( true === response.success && undefined !== response.data ) {
							$.each( response.data, function( key, ip ) {
								answer.results.push({
									id: ip,
									text: ip
								});
							});
						}

						if ( undefined === searchTerm ) {
							return answer;
						}

						ip_chunks = searchTerm.match( /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/ );

						if ( null === ip_chunks ) {
							return answer;
						}

						// remove whole match
						ip_chunks.shift();

						ip_chunks = $.grep(
							ip_chunks,
							function( chunk ) {
								var numeric = parseInt( chunk, 10 );
								return numeric <= 255 && numeric.toString() === chunk;
							}
						);

						if ( ip_chunks.length >= 4 ) {
							answer.results.push({
								id: searchTerm,
								text: searchTerm
							});
						}

						return answer;
					}
				},
				allowClear: false,
				multiple: true,
				maximumSelectionSize: 1,
				placeholder: $input_ip.data( 'placeholder' ),
				tags: true
			});
		}).on( 'change', function() {
			$( this ).prev( '.select2-container' ).find( 'input.select2-input' ).blur();
		});

		$( 'ul.select2-choices, ul.select2-choices li, input.select2-input', '.stream-exclude-list tr:not(.hidden) .ip_address' ).on( 'mousedown click focus', function() {
			var $container = $( this ).closest( '.select2-container' ),
			    $input     = $container.find( 'input.select2-input' ),
			    value      = $container.select2( 'data' );

			if ( value.length >= 1 ) {
				$input.blur();
				return false;
			}
		});

		$( '.stream-exclude-list tr:not(.hidden) .exclude_rules_remove_rule_row' ).on( 'click', function() {
			var $thisRow = $( this ).closest( 'tr' );

			$thisRow.remove();

			recalculate_rules_found();
			recalculate_rules_selected();
		});
	};

	initSettingsSelect2();

	$( '.stream-exclude-list tr:not(.hidden) select.select2-select.author_or_role' ).each( function() {
		$( this ).val( $( this ).data( 'selected-id' ) ).trigger( 'change' );
	});

	$( '.stream-exclude-list tr:not(.hidden) select.select2-select.connector_or_context' ).each( function() {
		var parts = [
				$( this ).siblings( '.connector' ).val(),
				$( this ).siblings( '.context' ).val()
		];
		if ( parts[1] === '' ) {
			parts.splice( 1, 1 );
		}
		$( this ).val( parts.join( '-' ) ).trigger( 'change' );
	});

	$( '#exclude_rules_new_rule' ).on( 'click', function() {
		var $excludeList = $( 'table.stream-exclude-list' );

		$( 'tr:not(.hidden) select.select2-select', $excludeList ).each( function() {
			$( this ).select2( 'destroy' );
		});

		var $lastRow = $( 'tr', $excludeList ).last(),
		    $newRow  = $lastRow.clone();

		$newRow.removeAttr( 'class' );
		$( '.stream-exclude-list tbody :input' ).off();
		$( ':input', $newRow ).off().val( '' );

		$lastRow.after( $newRow );

		initSettingsSelect2();

		recalculate_rules_found();
		recalculate_rules_selected();
	});

	$( '#exclude_rules_remove_rules' ).on( 'click', function() {
		var $excludeList = $( 'table.stream-exclude-list' ),
		    selectedRows = $( 'tbody input.cb-select:checked', $excludeList ).closest( 'tr' );

		if ( ( $( 'tbody tr', $excludeList ).length - selectedRows.length ) >= 2 ) {
			selectedRows.remove();
		} else {
			$( ':input', selectedRows ).val( '' );
			$( selectedRows ).not( ':first' ).remove();
			$( '.select2-select', selectedRows ).select2( 'val', '' );
		}

		$excludeList.find( 'input.cb-select' ).prop( 'checked', false );

		recalculate_rules_found();
		recalculate_rules_selected();
	});

	$( '.stream-exclude-list' ).closest( 'form' ).submit( function() {
		$( '.stream-exclude-list tbody tr.hidden', this ).each( function() {
				$( this ).find( ':input' ).removeAttr( 'name' );
		});
		$( '.stream-exclude-list tbody tr:not(.hidden) select.select2-select.connector_or_context', this ).each( function() {
				var parts = $( this ).val().split( '-' );
				$( this ).siblings( '.connector' ).val( parts[0] );
				$( this ).siblings( '.context' ).val( parts[1] );
				$( this ).removeAttr( 'name' );
		});
		$( '.stream-exclude-list tbody tr:not(.hidden) select.select2-select.ip_address', this ).each( function() {
			var firstSelected = $( 'option:selected', this ).first();
			$( 'option:selected:not(:first)', this ).each( function() {
				firstSelected.attr( 'value', firstSelected.attr( 'value' ) + ',' + $( this ).attr( 'value' ) );
				$( this ).removeAttr( 'selected' );
			});
		});
	});

	$( '.stream-exclude-list' ).closest( 'td' ).prev( 'th' ).hide();

	$( 'table.stream-exclude-list' ).on( 'click', 'input.cb-select', function() {
		recalculate_rules_selected();
	});

	function recalculate_rules_selected() {
		var $selectedRows = $( 'table.stream-exclude-list tbody tr:not( .hidden ) input.cb-select:checked' ),
		    $deleteButton = $( '#exclude_rules_remove_rules' );

		if ( 0 === $selectedRows.length ) {
			$deleteButton.prop( 'disabled', true );
		} else {
			$deleteButton.prop( 'disabled', false );
		}
	}

	function recalculate_rules_found() {
		var $allRows      = $( 'table.stream-exclude-list tbody tr:not( .hidden )' ),
		    $noRulesFound = $( 'table.stream-exclude-list tbody tr.no-items' ),
		    $selectAll    = $( '.check-column.manage-column input.cb-select' ),
		    $deleteButton = $( '#exclude_rules_remove_rules' );

		if ( 0 === $allRows.length ) {
			$noRulesFound.show();
			$selectAll.prop( 'disabled', true );
			$deleteButton.prop( 'disabled', true );
		} else {
			$noRulesFound.hide();
			$selectAll.prop( 'disabled', false );
		}

		wp_stream_regenerate_alt_rows( $allRows );
	}

	$( document ).ready( function() {
		recalculate_rules_found();
		recalculate_rules_selected();
	});
});
