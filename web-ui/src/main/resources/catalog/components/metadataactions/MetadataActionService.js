/*
 * Copyright (C) 2001-2016 Food and Agriculture Organization of the
 * United Nations (FAO-UN), United Nations World Food Programme (WFP)
 * and United Nations Environment Programme (UNEP)
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or (at
 * your option) any later version.
 *
 * This program is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA 02110-1301, USA
 *
 * Contact: Jeroen Ticheler - FAO - Viale delle Terme di Caracalla 2,
 * Rome - Italy. email: geonetwork@osgeo.org
 */

(function() {
  goog.provide('gn_mdactions_service');

  goog.require('gn_category');
  goog.require('gn_share');


  var module = angular.module('gn_mdactions_service', [
    'gn_share', 'gn_category'
  ]);

  module.service('gnMetadataActions', [
    '$rootScope',
    '$timeout',
    '$location',
    'gnHttp',
    'gnMetadataManager',
    'gnAlertService',
    'gnSearchSettings',
    'gnPopup',
    '$translate',
    '$q',
    '$http',
    function($rootScope, $timeout, $location, gnHttp,
             gnMetadataManager, gnAlertService, gnSearchSettings,
             gnPopup,
             $translate, $q, $http) {

      var windowName = 'geonetwork';
      var windowOption = '';

      var alertResult = function(msg) {
        gnAlertService.addAlert({
          msg: msg,
          type: 'success'
        });
      };

      /**
       * Open a popup and compile object content.
       * Bind to an event to close the popup.
       * @param {Object} o popup config
       * @param {Object} scope to build content uppon
       * @param {string} eventName
       */
      var openModal = function(o, scope, eventName) {
        var popup = gnPopup.create(o, scope);
        var myListener = $rootScope.$on(eventName,
            function(e, o) {
              $timeout(function() {
                popup.close();
              }, 0);
              myListener();
            });
      };

      var callBatch = function(service) {
        return gnHttp.callService(service).then(function(data) {
          alertResult(data.data);
        });
      };

      /**
       * Duplicate a metadata that can be a new child of the source one.
       * @param {string} id
       * @param {boolean} child
       */
      var duplicateMetadata = function(id, child) {
        var url = 'catalog.edit#/';
        if (id) {
          if (child) {
            url += 'create?childOf=' + id;
          } else {
            url += 'create?from=' + id;
          }
        }
        window.open(url, '_blank');
      };

      /**
       * Export as PDF (one or selection). If params is search object, we check
       * for sortBy and sortOrder to process the print. If it is a string
       * (uuid), we print only one metadata.
       * @param {Object|string} params
       */
      this.metadataPrint = function(params) {
        var url;
        if (angular.isObject(params) && params.sortBy) {
          url = gnHttp.getService('mdGetPDFSelection');
          url += '?sortBy=' + params.sortBy;
          if (params.sortOrder) {
            url += '&sortOrder=' + params.sortOrder;
          }
        }
        else if (angular.isString(params)) {
          // TODO: May depend on schema
          url = gnSearchSettings.formatter.defaultPdfUrl + params;
        }
        if (url) {
          location.replace(url);
        }
        else {
          console.error('Error while exporting PDF');
        }
      };

      /**
       * Export one metadata to RDF format.
       * @param {string} uuid
       */
      this.metadataRDF = function(uuid) {
        var url = gnHttp.getService('mdGetRDF') + '?uuid=' + uuid;
        location.replace(url);
      };

      /**
       * Export to MEF format (one or selection). If uuid is provided, export
       * one metadata, else export the whole selection.
       * @param {string} uuid
       */
      this.metadataMEF = function(uuid) {
        var url = gnHttp.getService('mdGetMEF') + '?version=2';
        url += angular.isDefined(uuid) ?
            '&uuid=' + uuid : '&format=full';

        location.replace(url);
      };

      this.exportCSV = function() {
        window.open(gnHttp.getService('csv'), windowName, windowOption);
      };
      this.validateMd = function(md) {
        if (md) {
          return gnMetadataManager.validate(md.getId()).then(function() {
            $rootScope.$broadcast('mdSelectNone');
            $rootScope.$broadcast('search');
          });
        }
        else {
          return callBatch('mdValidateBatch').then(function() {
            $rootScope.$broadcast('mdSelectNone');
            $rootScope.$broadcast('search');
          });
        }
      };

      this.deleteMd = function(md) {
        if (md) {
          return gnMetadataManager.remove(md.getId()).then(function() {
            $rootScope.$broadcast('mdSelectNone');
            // TODO: Here we may introduce a delay to not display the deleted
            // record in results.
            // https://github.com/geonetwork/core-geonetwork/issues/759
            $rootScope.$broadcast('search');
          });
        }
        else {
          return callBatch('mdDeleteBatch').then(function() {
            $rootScope.$broadcast('mdSelectNone');
            // TODO: Same here.
            $rootScope.$broadcast('search');
          });
        }
      };

      this.openPrivilegesPanel = function(md, scope) {
        openModal({
          title: $translate('privileges') + ' - ' +
              (md.title || md.defaultTitle),
          content: '<div gn-share="' + md.getId() + '"></div>'
        }, scope, 'PrivilegesUpdated');
      };

      this.openUpdateStatusPanel = function(scope) {
        openModal({
          title: 'updateStatus',
          content: '<div data-gn-metadata-status-updater="md"></div>'
        }, scope, 'metadataStatusUpdated');
      };

      this.startWorkflow = function(md, scope) {
        return $http.get('md.status.update?' +
            '_content_type=json&id=' + md.getId() +
            '&changeMessage=Enable workflow' +
            '&status=1').then(
            function(data) {
              gnMetadataManager.updateMdObj(md);
              scope.$emit('metadataStatusUpdated', true);
              scope.$emit('StatusUpdated', {
                msg: $translate('metadataStatusUpdatedWithNoErrors'),
                timeout: 2,
                type: 'success'});
            }, function(data) {
              scope.$emit('metadataStatusUpdated', false);
              scope.$emit('StatusUpdated', {
                title: $translate('metadataStatusUpdatedErrors'),
                error: data,
                timeout: 0,
                type: 'danger'});
            });
      };

      this.openPrivilegesBatchPanel = function(scope) {
        openModal({
          title: 'privileges',
          content: '<div gn-share="" gn-share-batch="true"></div>'
        }, scope, 'PrivilegesUpdated');
      };
      this.openBatchEditing = function(scope) {
        $location.path('/batchedit');
      };
      this.openCategoriesBatchPanel = function(scope) {
        openModal({
          title: 'categories',
          content: '<div gn-batch-categories=""></div>'
        }, scope, 'CategoriesUpdated');
      };

      this.openTransferOwnership = function(md, scope) {
        var uuid = md ? md.getUuid() : '';
        var ownerId = md ? md.getOwnerId() : '';
        openModal({
          title: 'transferOwnership',
          content: '<div gn-transfer-ownership="' + uuid +
              '" gn-transfer-md-owner="' + ownerId + '"></div>'
        }, scope, 'TransferOwnership');
      };
      /**
       * Duplicate the given metadata. Open the editor in new page.
       * @param {string} md
       */
      this.duplicate = function(md) {
        duplicateMetadata(md.getId(), false);
      };

      /**
       * Create a child of the given metadata. Open the editor in new page.
       * @param {string} md
       */
      this.createChild = function(md) {
        duplicateMetadata(md.getId(), true);
      };

      /**
       * Update publication on metadata (one or selection).
       * If a md is provided, it update publication of the given md, depending
       * on its current state. If no metadata is given, it updates the
       * publication on all selected metadata to the given flag (on|off).
       * @param {Object|undefined} md
       * @param {string} flag
       * @return {*}
       */
      this.publish = function(md, flag) {

        if (md) {
          flag = md.isPublished() ? 'off' : 'on';
        }
        var service = flag === 'on' ? 'publish' : 'unpublish';

        var publishNotification = function(data) {
          var message = '<h4>' + $translate(service + 'Completed') +
              '</h4><dl class="dl-horizontal"><dt>' +
              $translate('mdPublished') + '</dt><dd>' +
              data.data.published + '</dd><dt>' +
              $translate('mdUnpublished') + '</dt><dd>' +
              data.data.unpublished + '</dd><dt>' +
              $translate('mdUnmodified') + '</dt><dd>' +
              data.data.unmodified + '</dd><dt>' +
              $translate('mdDisallowed') + '</dt><dd>' +
              data.data.disallowed + '</dd></dl>';

          var success = 'success';
          if (md) {
            if ((flag === 'on' && data.data.published === 0) ||
                (flag !== 'on' && data.data.unpublished === 0)) {
              if (data.data.unmodified > 0) {
                message = $translate('metadataUnchanged');
              } else if (data.data.disallowed > 0) {
                message = $translate('accessRestricted');
              }
              success = 'danger';
            }
          }
          gnAlertService.addAlert({
            msg: message,
            type: success
          });

          if (md && success === 'success') {
            md.publish();
          }
        };
        if (angular.isDefined(md)) {
          return gnHttp.callService(service, {
            ids: md.getId()
          }).then(publishNotification);
        } else {
          return gnHttp.callService(service, {}).then(publishNotification);
        }
      };

      this.assignGroup = function(metadataId, groupId) {
        var defer = $q.defer();
        $http.get('md.group.update?id=' + metadataId +
            '&groupid=' + groupId)
          .success(function(data) {
              defer.resolve(data);
            })
          .error(function(data) {
              defer.reject(data);
            });
        return defer.promise;
      };

      this.assignCategories = function(metadataId, categories) {
        var defer = $q.defer(), ids = '';
        angular.forEach(categories, function(value) {
          ids += '&_' + value + '=on';
        });
        $http.get('md.category.update?id=' + metadataId + ids)
          .success(function(data) {
              defer.resolve(data);
            })
          .error(function(data) {
              defer.reject(data);
            });
        return defer.promise;
      };

      this.startVersioning = function(metadataId) {
        var defer = $q.defer();
        $http.get('md.versioning.start?id=' + metadataId)
          .success(function(data) {
              defer.resolve(data);
            })
          .error(function(data) {
              defer.reject(data);
            });
        return defer.promise;
      };

      /**
       * Get html formatter link for the given md
       * @param {Object} md
       */
      this.getPermalink = function(md) {

        var url = $location.absUrl().split('#')[0] + '#/metadata/' +
            md.getUuid();
        gnPopup.createModal({
          title: 'permalink',
          content: '<div gn-permalink-input="' + url + '"></div>'
        });
      };
    }]);
})();
