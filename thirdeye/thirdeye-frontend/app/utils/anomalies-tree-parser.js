import { isEmpty } from '@ember/utils';
import { set } from '@ember/object';
import moment from 'moment';
import { BREADCRUMB_TIME_DISPLAY_FORMAT } from 'thirdeye-frontend/utils/constants';

const CLASSIFICATIONS = {
  METRICS: {
    KEY: 'metrics',
    COMPONENT_PATH: 'entity-metrics',
    DEFAULT_TITLE: 'Metric Anomalies'
  },
  GROUPS: {
    KEY: 'groups',
    COMPONENT_PATH: 'entity-groups',
    DEFAULT_TITLE: 'ENTITY:'
  },
  ENTITIES: {
    KEY: 'entities',
    COMPONENT_PATH: 'parent-anomalies',
    DEFAULT_TITLE: 'Entity'
  }
};

/**
 * Format the timestamp into the form to be shown in the breadcrumb
 *
 * @param {Number} timestamp
 *   The timestamp of anomaly creation time in milliseconds
 *
 * @returns {String}
 *   Formatted timestamp. Example of the required format - "Sep 15 16:49 EST"
 */
const getFormattedBreadcrumbTime = (timestamp) => {
  const zoneName = moment.tz.guess();
  const timeZoneAbbreviation = moment.tz(zoneName).zoneAbbr();

  return `${moment(timestamp).format(BREADCRUMB_TIME_DISPLAY_FORMAT)} ${timeZoneAbbreviation}`;
};

/**
 * Parse the anomalies generated by the composite alert to populate parent-anomalies table with relevent details about
 * children for each anomaly.
 *
 * @param {Array<Object>} input
 *   The anomalies for composite alert.
 *
 * @returns {Array<Object>}
 *   Parsed out contents to populate parent-anomalies table
 */
const populateParentAnomaliesTable = (input) => {
  const output = [];

  for (const entry of input) {
    const { id, startTime, endTime, feedback, children } = entry;
    const entryOutput = {
      id,
      startTime,
      endTime,
      feedback
    };

    const details = {};
    if (children.length > 0) {
      for (const child of children) {
        const { metric, properties: { subEntityName } = {} } = child;
        const item = !isEmpty(metric) ? metric : subEntityName;

        if (item in details) {
          details[item]++;
        } else {
          details[item] = 1;
        }
      }
      entryOutput.details = details;
      output.push(entryOutput);
    }
  }

  return output;
};

/**
 * Parse the generated bucket for metric anomalies into the schema for the entity-metrics component
 *
 * @param {Object} input
 *   The metric anomalies bucket constituents
 *
 * @returns {Array<Object>}
 *   The content to be passed into the the leaf level entity-metrics component. Each item in the array represents
 *   contents for the row in the table.
 */
const parseMetricsBucket = (input) => {
  return [input];
};

/**
 * Parse the generated bucket for parent anomalies into the schema for the entity-groups component
 *
 * @param {Object} input
 *   The group anomalies bucket constituents
 *
 * @returns {Array<Object>}
 *   The content to be passed into the the entity-groups component. Each item in the array represents
 *   contents for the row in the table.
 */
const parseGroupsBucket = (input) => {
  const output = [];

  for (const group in input) {
    output.push(input[group]);
  }

  return output;
};

/**
 * Parse the generated bucket for parent anomalies into the schema for the parent-anomalies component
 *
 * @param {Object} input
 *   The parent anomalies bucket constituents
 *
 * @returns {Array<Object>}
 *   The content to be passed into the parent-anomalies component. Each item in the array represents
 *   contents for the row in the table.
 */
const parseEntitiesBucket = (input) => {
  const output = [];

  for (const entity in input) {
    const { componentPath, title, data } = input[entity];

    output.push({
      componentPath,
      title,
      data: populateParentAnomaliesTable(data)
    });
  }

  return output;
};

/**
 * Add the anomaly referencing a metric to the metric bucket
 *
 * @param {Object} buckets
 *   The reference to buckets object within which the anomaly needs to be classified
 * @param {Object} anomaly
 *   The metric anomaly that needs be classified added to the metric bucket
 * @param {String} metric
 *   The metric for which this anomaly was generated
 */
const setMetricsBucket = (buckets, anomaly, metric) => {
  const {
    METRICS: { KEY: metricKey, DEFAULT_TITLE, COMPONENT_PATH }
  } = CLASSIFICATIONS;
  const { [metricKey]: { data } = {} } = buckets;
  const { id, startTime, endTime, feedback, avgCurrentVal: current, avgBaselineVal: predicted } = anomaly;

  const metricTableRow = {
    id,
    startTime,
    endTime,
    metric,
    feedback,
    current,
    predicted
  };

  if (isEmpty(data)) {
    const metricBucketObj = {
      componentPath: COMPONENT_PATH,
      title: DEFAULT_TITLE,
      data: [metricTableRow]
    };

    set(buckets, `${metricKey}`, metricBucketObj);
  } else {
    data.push(metricTableRow);
  }
};

/**
 * Add the anomaly referencing a group constitient to the right group characterized by the subEntityName
 *
 * @param {Object} buckets
 *   The reference to buckets object within which the anomaly needs to be classified
 * @param {Object} anomaly
 *   The anomaly produced due to the anomaly summarize grouper that needs be classified into the appropriate bucket
 * @param {String} subEntityName
 *   The entity name under which certain set of metrics would be grouped
 * @param {String} groupName
 *   The group constituent name. Each group constituent hosts anomalies from one metric.
 */
const setGroupsBucket = (buckets, anomaly, subEntityName, groupName) => {
  const {
    GROUPS: { KEY: groupKey, COMPONENT_PATH, DEFAULT_TITLE }
  } = CLASSIFICATIONS;
  const {
    id,
    startTime,
    endTime,
    feedback,
    avgCurrentVal: current,
    avgBaselineVal: predicted,
    properties: { groupScore: criticality }
  } = anomaly;
  const groupTableRow = {
    id,
    groupName,
    startTime,
    endTime,
    feedback,
    criticality,
    current,
    predicted
  };

  if ([groupKey] in buckets) {
    if (subEntityName in buckets[groupKey]) {
      const {
        [subEntityName]: { data }
      } = buckets[groupKey];

      data.push(groupTableRow);
    } else {
      set(buckets, `${groupKey}.${subEntityName}`, {
        componentPath: COMPONENT_PATH,
        title: `${DEFAULT_TITLE}${subEntityName}`,
        data: [groupTableRow]
      });
    }
  } else {
    set(buckets, `${groupKey}`, {
      [subEntityName]: {
        componentPath: COMPONENT_PATH,
        title: `${DEFAULT_TITLE}${subEntityName}`,
        data: [groupTableRow]
      }
    });
  }
};

/**
 * Add the composite anomaly to the right bucket characterized by the subEntityName
 *
 * @param {Object} buckets
 *   The reference to buckets object within which the anomaly needs to be classified
 * @param {Object} anomaly
 *   The composite anomaly that needs be classified into the appropriate bucket
 * @param {String} subEntityName
 *   The entity name under which this anomaly falls
 */
const setEntitiesBucket = (buckets, anomaly, subEntityName) => {
  const {
    ENTITIES: { KEY: entityKey, COMPONENT_PATH }
  } = CLASSIFICATIONS;
  let title;

  if (isEmpty(subEntityName)) {
    const {
      ENTITIES: { DEFAULT_TITLE }
    } = CLASSIFICATIONS;

    title = DEFAULT_TITLE;
  } else {
    title = subEntityName;
  }

  if ([entityKey] in buckets) {
    if (subEntityName in buckets[entityKey]) {
      const {
        [subEntityName]: { data }
      } = buckets[entityKey];

      data.push(anomaly);
    } else {
      set(buckets, `${entityKey}.${subEntityName}`, {
        componentPath: COMPONENT_PATH,
        title: title,
        data: [anomaly]
      });
    }
  } else {
    set(buckets, `${entityKey}`, {
      [subEntityName]: {
        componentPath: COMPONENT_PATH,
        title: title,
        data: [anomaly]
      }
    });
  }
};

/**
 * Classify the child anomalies of particular anomaly into metrics, groups and parent-anomalies
 *   -Anomalies of the yaml type METRIC_ALERT classify into "metrics"
 *   -Anomalies of the yaml type METRIC_ALERT and grouper as ANOMALY_SUMMARIZE classify into "groups"
 *   -Anomalies of the yaml type COMPOSITE_ALERT classify into "parent-anomalies"
 *
 * @param {Object} input
 *   The subtree structure that needs to be parsed
 *
 * @return {Object}
 *   The classification of children anomalies into the buckets of "metrics", "groups" and "entities".
 *   The structure will take the form as below
 *   {
 *     metrics: {
 *        componentPath: '',
 *        title: '',
 *        data:[{},{}] //anomaly entries
 *      },
 *     groups: {
 *         groupEntity1: {
 *            componentPath: '',
 *            title:'',
 *            data:[{},{}]  //each entry in array corresponds to information for 1 group constituent
 *         },
 *         groupEntity2: {
 *         }
 *      },
 *     entities: {
 *         entity1: {
 *           componentPath: '',
 *            title:'',
 *            data:[{},{}]
 *         },
 *         entity2: {
 *         }
 *     }
 *   }
 */
const generateBuckets = (input) => {
  const buckets = {};
  const { children } = input;

  for (const child of children) {
    const { metric, properties: { detectorComponentName = '', subEntityName, groupKey } = {} } = child;

    if (!isEmpty(metric)) {
      setMetricsBucket(buckets, child, metric);
    } else if (isEmpty(metric) && detectorComponentName.includes('ANOMALY_SUMMARIZE')) {
      setGroupsBucket(buckets, child, subEntityName, groupKey);
    } else {
      setEntitiesBucket(buckets, child, subEntityName);
    }
  }

  return buckets;
};

/**
 * Perform drilldown of anomaly grouped by anomaly summarize grouper. This involves generating the breadcrumb information
 * and component details for the subtree for this anomaly.
 *
 * @param {Object} input
 *   The subtree structure that needs to be parsed
 *
 * @return {Object}
 *   The breadcrumb info and data for populating component comprising of group constituents
 */
const parseGroupAnomaly = (input) => {
  const output = [];
  const data = [];
  const {
    GROUPS: { DEFAULT_TITLE, COMPONENT_PATH }
  } = CLASSIFICATIONS;
  const {
    id,
    children,
    properties: { subEntityName, groupKey }
  } = input;
  const breadcrumbInfo = {
    title: `${subEntityName}/${groupKey}`,
    id
  };

  for (const anomaly of children) {
    const {
      id,
      startTime,
      endTime,
      metric,
      dimensions,
      avgCurrentVal: current,
      avgBaselineVal: predicted,
      feedback
    } = anomaly;

    data.push({
      id,
      startTime,
      endTime,
      feedback,
      metric,
      dimensions,
      current,
      predicted
    });
  }

  output.push({
    componentPath: COMPONENT_PATH,
    title: DEFAULT_TITLE,
    data
  });

  return { breadcrumbInfo, output };
};

/**
 * Perform drilldown of composite anomaly. This involves generating the breadcrumb information
 * and component details for the subtree for the composite anomaly
 *
 * @param {Object} input
 *   The subtree structure that needs to be parsed
 *
 * @return {Object}
 *   The breadcrumb info and data for populating child components from input subtree.
 */
const parseCompositeAnomaly = (input) => {
  const output = [];
  const buckets = generateBuckets(input);
  const {
    METRICS: { KEY: metricKey },
    GROUPS: { KEY: groupKey }
  } = CLASSIFICATIONS;
  const { id, startTime } = input;
  const breadcrumbInfo = {
    id,
    title: getFormattedBreadcrumbTime(startTime)
  };

  for (const key in buckets) {
    const entry = buckets[key];

    if (key === metricKey) {
      output.push(...parseMetricsBucket(entry));
    } else if (key === groupKey) {
      output.push(...parseGroupsBucket(entry));
    } else {
      output.push(...parseEntitiesBucket(entry));
    }
  }

  return { breadcrumbInfo, output };
};

/**
 * Perform depth-first-search to retrieve anomaly in the tree
 *
 * @param {Number} id
 *   The id of the anomaly to be searched
 * @param {Object} input
 *   The subtree structure comprising the anomaly
 *
 * @return {Object}
 *   The anomaly referenced by id
 */
const findAnomaly = (id, input) => {
  const { id: anomalyId, children } = input;

  if (anomalyId === id) {
    return input;
  }
  if (children.length > 0) {
    for (const child of children) {
      const anomaly = findAnomaly(id, child);
      if (!isEmpty(anomaly)) {
        return anomaly;
      }
    }
  }
};

/**
 * Parse the tree to get the breadcrumb and parent anomalies table data for root level exploration.
 *
 * @param {Number} explorationId
 *   The exploration Id for the alert
 * @param {Array<Object>} input
 *   The tree structure representing anomalies data for the explorationId.
 *
 * @return {Object}
 *   The breadcrumb info and data for instantiating parent anomlaies table
 */
export const parseRoot = (explorationId, input) => {
  const output = [];
  const {
    ENTITIES: { COMPONENT_PATH }
  } = CLASSIFICATIONS;

  const breadcrumbInfo = {
    title: 'Alert Anomalies',
    id: explorationId,
    isRoot: true
  };

  if (Array.isArray(input)) {
    const parentAnomaliesData = populateParentAnomaliesTable(input);

    output.push({
      componentPath: COMPONENT_PATH,
      title: 'Entity',
      data: parentAnomaliesData
    });
  }

  return { breadcrumbInfo, output };
};

/**
 * Parse the tree to get the breadcrumb and parent anomalies table data for exploration of non-root level anomaly.
 *
 * @param {Number} id
 *   The anomaly id
 * @param {Array<Object> or Object} input
 *   The tree structure hosting the anomaly referenced by the id.
 *      -If the entire tree is being passed, it would in array form
 *      -If a subtree is being passed, it would be in object form
 *
 * @return {Object}
 *   The breadcrumb info and data for instantiating tables at any level in tree
 */
export const parseSubtree = (id, input) => {
  let anomaly;
  if (Array.isArray(input)) {
    for (const entry of input) {
      anomaly = findAnomaly(id, entry);
    }
  } else {
    anomaly = findAnomaly(id, input);
  }

  const { metric, properties: { detectorComponentName = '' } = {} } = anomaly;

  if (isEmpty(metric) && detectorComponentName.includes('ANOMALY_SUMMARIZE')) {
    return parseGroupAnomaly(anomaly);
  } else if (isEmpty(metric)) {
    return parseCompositeAnomaly(anomaly);
  }
};
