(function (window, angular) {

  'use strict';

  // Extending Angular.js module.
  angular.module('ngInputModified')
    .directive('ngModel', ngModelModifiedFactory)
  ;

  /**
   * This directive extends ng-model with modifiable behavior.
   *
   * @constructor
   * @param {object} $animate
   * @param {object} inputModifiedConfig
   *
   * @returns {object}
   */
  function ngModelModifiedFactory ($animate, inputModifiedConfig) {

    // Shortcut.
    var config = inputModifiedConfig;

    return {
      restrict: 'A',
      require: ['?ngModel', '?^form', '?^bsModifiable'],
      link: function ($scope, $element, attrs, controllers) {

        /**
         * Path to a model variable inside the scope.
         * It can be as simple as: "foo" or as complex as "foo.bar[1].baz.qux".
         */
        var modelPath = attrs.ngModel;

        // Handling controllers.
        var modelCtrl = controllers[0];
        var formCtrl = controllers[1];
        var bsModifiable = controllers[2];

        // Model controller is required for this directive to operate.
        // Parent form controller is optional.
        if (!modelCtrl) {
          return;
        }

        // This behavior is applied only when form element or
        // one of it's parents has a bsModifiable directive present
        // or when global switch is set.
        var enabled = (bsModifiable ? bsModifiable.isEnabled() : undefined);
        if (
             ( config.enabledGlobally && false == enabled)
          || (!config.enabledGlobally && true !== enabled)
        ) {
          return;
        }

        // Flag to indicate that master value was initialized.
        var masterValueIsSet = false;

        // Saving handle to original set-pristine method.
        var originalSetPristine = modelCtrl.$setPristine;

        // Replacing original set-pristine with our own.
        modelCtrl.$setPristine = setPristine;

        modelCtrl.modified = false;

        modelCtrl.masterValue = undefined;

        modelCtrl.reset = reset;

        // Watching for model value changes.
        $scope.$watch(modelPath, onInputValueChanged);


        /**
         * Sets proper modification state for model controller according to
         * current/master value.
         */
        function onInputValueChanged () {

          if (!masterValueIsSet) {
            initializeMasterValue();
          }

          var modified = !compare(modelCtrl.$modelValue, modelCtrl.masterValue);

          // If modified flag has changed.
          if (modelCtrl.modified !== modified) {

            // Setting new flag.
            modelCtrl.modified = modified;

            // Notifying the form.
            if (formCtrl && 'function' === typeof formCtrl.$$notifyModelModifiedStateChanged) {
              formCtrl.$$notifyModelModifiedStateChanged(modelCtrl);
            }

            // Re-decorating the element.
            updateCssClasses();
          }
        }

        /**
         * Initializes master value if required.
         */
        function initializeMasterValue () {

          // Initializing the master value.
          modelCtrl.masterValue = modelCtrl.$modelValue;

          // Initially decorating the element.
          updateCssClasses();

          masterValueIsSet = true;
        }

        /**
         * Decorates element with proper CSS classes.
         */
        function updateCssClasses () {
          $animate.addClass($element, (modelCtrl.modified ? config.modifiedClassName : config.notModifiedClassName));
          $animate.removeClass($element, (modelCtrl.modified ? config.notModifiedClassName : config.modifiedClassName));
        }

        /**
         * Overloading original set-pristine method.
         */
        function setPristine () {

          // Calling overloaded method.
          originalSetPristine.apply(this, arguments);

          // Updating parameters.
          modelCtrl.masterValue = modelCtrl.$modelValue;
          modelCtrl.modified = false;

          // Notifying the form.
          formCtrl.$$notifyModelModifiedStateChanged(modelCtrl);

          // Re-decorating the element.
          updateCssClasses();
        }

        /**
         * Replaces current input value with a master value.
         */
        function reset () {
          try {
            eval('$scope.' + modelPath + ' = modelCtrl.masterValue;');
          } catch (exception) {
            // Missing specified model. Do nothing.
          }
        }

      }
    };
  }

  /**
   * Returns true if specified values are equal, false otherwise.
   * Supports dates comparison.
   *
   * @param {*} value1
   * @param {*} value2
   *
   * @returns {boolean}
   */
  function compare (value1, value2) {
    value1 = normalizeValue(value1);
    value2 = normalizeValue(value2);

    if ('object' === typeof value1 && 'object' === typeof value2) {
      if (value1 instanceof Date && value2 instanceof Date) {
        // Comparing two dates.
        return (value1.getTime() === value2.getTime());
      } else {
        // Comparing two objects.
        return angular.equals(value1, value2);
      }
    }

    // In all other cases using weak comparison.
    return (value1 == value2);
  }

  /**
   * Casting all null-like values to actual null for guaranteed comparison.
   *
   * @param {*} value
   *
   * @returns {*}
   */
  function normalizeValue (value) {
    return (undefined === value || '' === value ? null : value);
  }

})(window, angular);
