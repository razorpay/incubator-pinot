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

<#list detectionToAnomalyDetailsMap[detectionName] as anomaly>
<#if anomaly.metric==metric>
<#if newTable>
  *Metric:* _${metric}_
  *Detection Name:* <${dashboardHost}/app/#/manage/explore/${functionToId[detectionName]?string.computer}| _${detectionName}_ >
  <#if description?has_content>
  *Description:* _${description}_ 
  </#if>
  <#rt>${'\n'}>Type: <${anomaly.anomalyURL}${anomaly.anomalyId}|${anomaly.anomalyType}>
  <#rt>${'\n'}>Duration: ${anomaly.duration}
  <#rt>${'\n'}>Start: *${anomaly.startDateTime}* ${anomaly.timezone}
  <#if anomaly.dimensions?has_content>
  <#list anomaly.dimensions as dimension> 
  <#rt>${'\n'}>Dimension: ${dimension}
  </#list>
  </#if>
  <#rt>${'\n'}>Current: ${anomaly.currentVal}
  <#if anomaly.baselineVal == "+"><#rt>${'\n'}>Predicted: _Higher_ <#else><#rt>${'\n'}>Predicted: _Lower_ </#if>
  <#--  <${anomaly.anomalyURL}${anomaly.anomalyId}|Link>  -->
</#if>
</#if>
</#list>
</#list>
</#list>

  <#--  :memo: _You are receiving this alert because you have subscribed to ThirdEye Alert Service for *${alertConfigName}*. If you have any questions regarding this report, please contact thirdeye team_  -->