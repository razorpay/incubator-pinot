<#if anomalyCount == 1>
  ThirdEye has detected <${dashboardHost}/app/#/anomalies?anomalyIds=${anomalyIds}|an anomaly> on the metric <#list metricsMap?keys as id>*${metricsMap[id].name}*</#list> between *${startTime}* and *${endTime}* (${timeZone})
<#else>
  ThirdEye has detected <${dashboardHost}/app/#/anomalies?anomalyIds=${anomalyIds}|${anomalyCount} anomalies> on the metrics listed below between *${startTime}* and *${endTime}* (${timeZone})
</#if>
<#list metricToAnomalyDetailsMap?keys as metric>
  <#list detectionToAnomalyDetailsMap?keys as detectionName>
    <#assign newTable = false>
    <#list detectionToAnomalyDetailsMap[detectionName] as anomaly>
      <#if anomaly.metric==metric>
        <#assign newTable=true>
        <#assign description=anomaly.funcDescription>
      </#if>
    </#list>

    <#if newTable>
      *Metric:* _${metric}_
      *Alert Name:* <${dashboardHost}/app/#/manage/explore/${functionToId[detectionName]?string.computer}| _${detectionName}_ >
      *Description:* ${description}
    </#if>

    <#list detectionToAnomalyDetailsMap[detectionName] as anomaly>
      <#if anomaly.metric==metric>
        <#if newTable>
          Start: ${anomaly.startDateTime} ${anomaly.timezone}
          Link: ${anomaly.anomalyURL}${anomaly.anomalyId}
          Duration: ${anomaly.duration}
          Type: ${anomaly.anomalyType}
          Dimensions: <#if anomaly.dimensions?has_content><#list anomaly.dimensions as dimension> _${dimension}_ </#list><#else> _none_ </#if>
          Current:  _${anomaly.currentVal}_
          Predicted: ${anomaly.baselineVal}
          Change: ${anomaly.positiveLift?string('+','')}${anomaly.lift}
        </#if>
        <#assign newTable = false>
      </#if>
    </#list>
  </#list>
</#list>

_You are receiving this alert because you have subscribed to ThirdEye Alert Service for *${alertConfigName}*. If you have any questions regarding this report, please contact thirdeye team_