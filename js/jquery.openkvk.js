(function ($) {
    "use strict";

    var OpenKvk = function (container, options) {
        options = $.extend({}, OpenKvk.DEFAULTS, options);
        for (var p in options.resultMapping) {
            if (options.resultMapping.hasOwnProperty(p) && options.resultMapping === null) {
                delete options.resultMapping[p];
            }
        }
        this.options = options;

        this.container = container = $(container);

        this.searchFields = $(this.options.searchFields);
        this.searchFields.on('focusout.openkvk', this.search.bind(this));

        this.container.on('click', this.options.resultItemSelector, function(event) {
            var current = $(event.currentTarget);
            var data = current.data('openkvk-data');
            if (data !== undefined) {
                event.preventDefault();
                options.onSelection(data);
            }
        });
        this.lastQuery = null;
    };

    OpenKvk.DEFAULTS = {
        api: 'https://officieel.openkvk.nl/json/',

        onSelection: function(data) {
            alert(JSON.stringify(data));
        },
        filter: function (result) {
            return !result.hasOwnProperty('status');
        },

        searchFields: '.zipcode, .number',

        resultItemSelector: '.list-group-item',
        loadingSelector: '.openkvk-loading',

        resultTemplate: '<a href="#" class="list-group-item">' +
        '<h4 class="list-group-item-heading"></h4>' +
        '<p class="list-group-item-text">' +
        '<strong class="companyNumber"></strong><br />' +
        '<span class="address"></span><br/><span class="zipCode"></span> <span class="city"></span>' +
        '</p>' +
        '</a>',
        noResultTemplate: '<li class="list-group-item list-group-item-warning">No results</li>',
        errorTemplate: '<li class="list-group-item list-group-item-danger">No results</li>',

        resultMapping: {
            rechtspersoon: '.list-group-item-heading',
            vestigingsnummer: null,
            adres: '.address',
            woonplaats: '.city',
            kvk: '.companyNumber',
            postcode: 'zipCode',
            type: null,
            kvks: null,
            status: null
        },

        renderResult: null,
        renderNoResult: null,
        renderError: null
    };

    OpenKvk.prototype.search = function () {
        var self = this;

        var query = $.trim(this.searchFields.map(function () {
            return $(this).val();
        }).get().join(' '));

        if (this.lastQuery === query) {
            return;
        }
        this.lastQuery = query;

        if (query === '') {
            this._renderNoResults(query);
            return;
        }

        var url = this.options.api + encodeURIComponent(query);
        this._triggerLoading(true);
        $.getJSON(url, this._searchSuccess.bind(this, query))
            .fail(function (xhr, textStatus) {
                if (xhr.status === 404) {
                    self._renderNoResults(query);
                } else {
                    self._renderError("Request failed: " + textStatus, jqXHR);
                }
                self._triggerLoading(false);
            })
            .done(function(){
                self._triggerLoading(false);
            });
    };

    OpenKvk.prototype.destroy = function () {
        this.container.off('.openkvk');
        this.searchFields.off('.openkvk');

        delete this.container;
        delete this.options;
        delete this.searchFields;
    };

    OpenKvk.prototype._searchSuccess = function (query, data, textStatus, xhr) {
        if (!$.isArray(data)) {
            this._renderError("Invalid data received.", xhr);
            return;
        }

        data = data.filter(this.options.filter);
        if (data.length === 0) {
            this._renderNoResults(query);
            return;
        }

        this._renderResults(data, query);
    };

    OpenKvk.prototype._renderResults = function (data, query) {
        if ($.isFunction(this.options.renderResult)) {
            this.options.renderResult(data, query);
            return;
        }

        var template = this.options.resultTemplate;
        var map = this.options.resultMapping;
        var items = $.map(data, function (itemData) {
            var item = $(template);
            item.data('openkvk-data', itemData);

            $.each(map, function (prop, selector) {
                item.find(selector).text(itemData[prop]);
            });

            return item;
        });

        this.container.empty().append(items);
    };

    OpenKvk.prototype._renderNoResults = function (query) {
        if ($.isFunction(this.options.renderResult)) {
            this.options._renderNoResults(query);
            return;
        }

        this.container.empty().append(this.options.noResultTemplate);
    };

    OpenKvk.prototype._renderError = function (message, xhr) {
        if ($.isFunction(this.options.renderError)) {
            this.options.renderError(message, xhr);
            return;
        }

        this.container.empty();
        this.container.empty().append($(this.options.errorTemplate).text(message));
    };

    OpenKvk.prototype._triggerLoading = function (show) {
        if (show) {
            $(this.options.loadingSelector).show();
        } else {
            $(this.options.loadingSelector).hide();
        }
    };

    $.fn.openkvk = function (option) {
        return this.each(function () {
            var $this = $(this);
            var data = $this.data('openkvk');
            var options = typeof option == 'object' ? option : {};

            if (!data) {
                data = new OpenKvk(this, options);
                $this.data('openkvk', data);
            }
            if (typeof option == 'string') {
                data[option]();

                if (option == 'destroy') {
                    $this.removeData('openkvk');
                }
            }
        });
    };
})(jQuery);
