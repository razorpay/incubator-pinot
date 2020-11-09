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
  <#if anomalyCount > 1>
  Metric: _${metric}_
  </#if>
  Detection Name: <${dashboardHost}/app/#/manage/explore/${functionToId[detectionName]?string.computer}| _${detectionName}_ >
  <#if description?has_content>
  Description: _${description}_
  </#if>
</#if>

<#list detectionToAnomalyDetailsMap[detectionName] as anomaly>
<#if anomaly.metric==metric>
<#if newTable>
  ${anomaly.anomalyType} for ${anomaly.duration} at start time: *${anomaly.startDateTime}* ${anomaly.timezone}
  <#if anomaly.dimensions?has_content>
  <#list anomaly.dimensions as dimension> 
    dimension: ${dimension}
  </#list>
  </#if>
  Current: ${anomaly.currentVal}
  <#if anomaly.baselineVal == "+">
  Predicted: _Higher_
  <#else>
  Predicted: _Lower_
  </#if>
  <${anomaly.anomalyURL}${anomaly.anomalyId}|More details...>
</#if>
<#assign newTable = false>
</#if>
</#list>
</#list>
</#list>

  <#--  :memo: _You are receiving this alert because you have subscribed to ThirdEye Alert Service for *${alertConfigName}*. If you have any questions regarding this report, please contact thirdeye team_  -->