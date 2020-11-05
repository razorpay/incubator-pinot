/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

package org.apache.pinot.thirdeye.detection.cache;

import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

import org.apache.commons.collections.MapUtils;
import org.apache.commons.lang3.StringUtils;
import org.apache.pinot.thirdeye.anomaly.utils.ThirdeyeMetricsUtil;
import org.apache.pinot.thirdeye.detection.ConfigUtils;
import org.redisson.Redisson;
import org.redisson.api.RTimeSeries;
import org.redisson.api.RedissonClient;
import org.redisson.client.RedisConnectionException;
import org.redisson.config.Config;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * DAO class used to fetch data from Redis.
 */

public class RedisCacheDAO implements CacheDAO {

	private static final String HOSTS = "hosts";
	private static final String AUTH_USERNAME = "authUsername";
	private static final String AUTH_PASSWORD = "authPassword";
	public static final String IDLE_CONNECTION_TIMEOUT = "idleConnectionTimeout";
	public static final String CONNECT_TIMEOUT = "connectTimeout";
	public static final String TIMEOUT = "timeout";
	public static final String RETRY_ATTEMPTS = "retryAttempts";
	public static final String RETRY_INTERVAL = "retryInterval";
	public static final String PING_CONNECTION_INTERVAL = "pingConnectionInterval";
	public static final String KEEP_ALIVE = "keepAlive";
	public static final String TCP_NO_DELAY = "tcpNoDelay";

	public static final String DEFAULT_HOST = "redis://127.0.0.1:6379";
	public static final String DEFAULT_AUTH_USERNAME = "";
	public static final String DEFAULT_AUTH_PASSWORD = "";
	public static final int DEFAULT_IDLE_CONNECTION_TIMEOUT = 10000;
	public static final int DEFAULT_CONNECT_TIMEOUT = 10000;
	public static final int DEFAULT_TIMEOUT = 3000;
	public static final int DEFAULT_RETRY_ATTEMPTS = 3;
	public static final int DEFAULT_RETRY_INTERVAL = 1500;
	public static final int DEFAULT_PING_CONNECTION_INTERVAL = 30000;
	public static final boolean DEFAULT_KEEP_ALIVE = false;
	public static final boolean DEFAULT_TCP_NO_DELAY = false;

	// private static final String SERIALIZATION = "serialization";
	// public static final String DEFAULT_SERIALIZATION = "json";
	// public static final String DEFAULT_ALLOWED_TYPE = "aln,var";

	private static final Logger LOG = LoggerFactory.getLogger(RedisCacheDAO.class);

	private Config redissonConfig;
	private RedissonClient redissonClient;
	private boolean redisState;

	// Eg: KEY = metricId:2:dimensionKey:3158902058
	private static final String KEY_PREFIX = "thirdeyeMetricId:";

	public RedisCacheDAO() {
		this.createDataStoreConnection();
	}

	/**
	 * Initialize connection to Redis
	 */
	private void createDataStoreConnection() {
		LOG.info("Starting Redis Connection......");
		CacheDataSource dataSource = CacheConfig.getInstance().getCentralizedCacheSettings().getDataSourceConfig();
		Map<String, Object> dataSourceconfig = dataSource.getConfig();
		List<String> hosts = ConfigUtils.getList(dataSourceconfig.get(HOSTS));
		redissonConfig = new Config();

		// Taking only one host as of now.
		String host = "";
		if (hosts.size() == 0) {
			host = DEFAULT_HOST;
		} else {
			host = (String) hosts.toArray()[0];
		}
		redissonConfig.useSingleServer().setAddress(host);

		String username = (StringUtils.isNotEmpty((String) dataSourceconfig.get(AUTH_USERNAME)))
				? (String) dataSourceconfig.get(AUTH_USERNAME)
				: DEFAULT_AUTH_USERNAME;
		redissonConfig.useSingleServer().setUsername(username);

		String password = (StringUtils.isNotEmpty((String) dataSourceconfig.get(AUTH_PASSWORD)))
				? (String) dataSourceconfig.get(AUTH_PASSWORD)
				: DEFAULT_AUTH_PASSWORD;
		redissonConfig.useSingleServer().setPassword(password);

		int idleConnectionTimeout = ((Integer) dataSourceconfig.get(IDLE_CONNECTION_TIMEOUT) == null)
				? DEFAULT_IDLE_CONNECTION_TIMEOUT
				: (Integer) dataSourceconfig.get(IDLE_CONNECTION_TIMEOUT);
		redissonConfig.useSingleServer().setIdleConnectionTimeout(idleConnectionTimeout);

		int connectTimeout = ((Integer) dataSourceconfig.get(CONNECT_TIMEOUT) == null) ? DEFAULT_CONNECT_TIMEOUT
				: (Integer) dataSourceconfig.get(CONNECT_TIMEOUT);
		redissonConfig.useSingleServer().setConnectTimeout(connectTimeout);

		int timeout = ((Integer) dataSourceconfig.get(TIMEOUT) == null) ? DEFAULT_TIMEOUT
				: (Integer) dataSourceconfig.get(TIMEOUT);
		redissonConfig.useSingleServer().setTimeout(timeout);

		int retryAttempts = ((Integer) dataSourceconfig.get(RETRY_ATTEMPTS) == null) ? DEFAULT_RETRY_ATTEMPTS
				: (Integer) dataSourceconfig.get(RETRY_ATTEMPTS);
		redissonConfig.useSingleServer().setRetryAttempts(retryAttempts);

		int retryInterval = ((Integer) dataSourceconfig.get(RETRY_INTERVAL) == null) ? DEFAULT_RETRY_INTERVAL
				: (Integer) dataSourceconfig.get(RETRY_INTERVAL);
		redissonConfig.useSingleServer().setRetryInterval(retryInterval);

		int pingConnectionInterval = ((Integer) dataSourceconfig.get(PING_CONNECTION_INTERVAL) == null)
				? DEFAULT_PING_CONNECTION_INTERVAL
				: (Integer) dataSourceconfig.get(PING_CONNECTION_INTERVAL);
		redissonConfig.useSingleServer().setPingConnectionInterval(pingConnectionInterval);

		boolean keepAlive = ((Boolean) dataSourceconfig.get(KEEP_ALIVE) == null) ? DEFAULT_KEEP_ALIVE
				: (Boolean) dataSourceconfig.get(KEEP_ALIVE);
		redissonConfig.useSingleServer().setKeepAlive(keepAlive);

		boolean tcpNoDelay = ((Boolean) dataSourceconfig.get(TCP_NO_DELAY) == null) ? DEFAULT_TCP_NO_DELAY
				: (Boolean) dataSourceconfig.get(TCP_NO_DELAY);
		redissonConfig.useSingleServer().setKeepAlive(tcpNoDelay);

		// Creating Redisson Client
		redissonClient = getRedissonClient();
		redisState = true;
		LOG.info("Redis Connection Successful.");
	}

	/**
	 * Fetches time-series data from cache. Formats it into a list of
	 * TimeSeriesDataPoints before returning. The raw results will look something
	 * like this: { { "time": 1000, "123456": "30.0" }, { "time": 2000, "123456":
	 * "893.0" }, { "time": 3000, "123456": "900.6" } }
	 * 
	 * @param request ThirdEyeCacheRequest. Wrapper for ThirdEyeRequest.
	 * @return list of TimeSeriesDataPoint
	 */

	public ThirdEyeCacheResponse tryFetchExistingTimeSeries(ThirdEyeCacheRequest request) throws Exception {
		long metricId = request.getMetricId();
		String dimensionKey = request.getDimensionKey();

		// filter1: cached values are queried on combination of metricId, dimensionKey
		// Eg:metricId:2:dimensionKey:3158902058
		String keyVal = createKey(metricId, dimensionKey);

		RTimeSeries<Map<String, Object>> ts = getRedissonClient().getTimeSeries(keyVal);

		ThirdeyeMetricsUtil.redisCallCounter.inc();
		if (ts.size() == 0) {
			LOG.info("no redis cache found for window startTime = {} to endTime = {}", request.getStartTimeInclusive(),
					request.getEndTimeExclusive());
			ThirdeyeMetricsUtil.redisExceptionCounter.inc();
			return new ThirdEyeCacheResponse(request, new ArrayList<>());
		}

		long start = request.getStartTimeInclusive();
		// NOTE: we subtract 1 granularity from the end date because reddison
		// RTimeSeries's range is inclusive on both sides
		long end = request.getEndTimeExclusive() - request.getRequest().getGroupByTimeGranularity().toMillis();

		LOG.info("reading redis cache for window startTime = {} to endTime = {}", start, end);

		// filter2: cached values are queried on start and end timestamp
		Collection<Map<String, Object>> cacheValues = ts.range(start, end);

		List<TimeSeriesDataPoint> timeSeriesRows = new ArrayList<>();
		for (Map<String, Object> cacheValue : cacheValues) {
			long timestamp = (long) cacheValue.get(CacheConstants.TIMESTAMP);
			Double dataValue = (Double) cacheValue.get(CacheConstants.DIMENSION_KEY_VALUE);
			timeSeriesRows.add(new TimeSeriesDataPoint(request.getMetricUrn(), timestamp, request.getMetricId(),
					String.valueOf(dataValue)));
		}
		return new ThirdEyeCacheResponse(request, timeSeriesRows);
	}

	/**
	 * Insert a TimeSeriesDataPoint into Redis. If a document for this data point
	 * already exists within Redis and the data value for the metricURN already
	 * exists in the cache, we don't do anything. An example document generated and
	 * inserted for this might look like: { "timestamp": 123456700000 "metricId":
	 * 123456, "61427020": "3.0", "83958352": "59.6", "98648743": "0.0" }
	 * 
	 * @param point data point
	 */
	public void insertTimeSeriesDataPoint(TimeSeriesDataPoint point) {
		// Check if key (metricId:2:dimensionKey:3158902058) exists
		// if so, then update - touch/ttl
		// if not create a key and set data, ttl value

		long timestamp = point.getTimestamp();
		long metricId = point.getMetricId();
		String dimensionKey = point.getMetricUrnHash();
		String keyVal = createKey(metricId, dimensionKey);
		ThirdeyeMetricsUtil.redisCallCounter.inc();

		if (isActive()) {
			int ttl = CacheConfig.getInstance().getCentralizedCacheSettings().getTTL();
			// ts is the key in the redis store. Eg: metricId:2:dimensionKey:3158902058
			RTimeSeries<Map<String, Object>> ts = getRedissonClient().getTimeSeries(keyVal);
			// in ts, all the timestamps associated with the key will be stored as a
			// timeseries data along with metric information.
			Map<String, Object> cacheValue = ts.get(timestamp);
			if (MapUtils.isEmpty(cacheValue)) {
				Map<String, Object> values = new HashMap<String, Object>();
				values.put(CacheConstants.TIMESTAMP, timestamp);
				values.put(CacheConstants.METRIC_ID, point.getMetricId());
				values.put(CacheConstants.DIMENSION_KEY, point.getMetricUrnHash());
				values.put(CacheConstants.DIMENSION_KEY_VALUE, point.getDataValueAsDouble());
				try {
					// TimeSeries Data has timestamp and new content
					LOG.info("Creating redis cache for Timestamp = {}", timestamp);
					ts.add(timestamp, values, new Long(ttl), TimeUnit.SECONDS);
				} catch (RedisConnectionException e) {
					redisState = false;
				}
			} else {
				String dKey = (String) cacheValue.get(CacheConstants.DIMENSION_KEY);
				Double dimensionKeyVal = (Double) cacheValue.get(CacheConstants.DIMENSION_KEY_VALUE);
				if (dKey == point.getMetricUrnHash() && dimensionKeyVal == point.getDataValueAsDouble()) {
					return;
				}
				cacheValue.put(CacheConstants.DIMENSION_KEY, point.getMetricUrnHash());
				cacheValue.put(CacheConstants.DIMENSION_KEY_VALUE, point.getDataValueAsDouble());
				try {
					ts.remove(timestamp); // removing old data as timeseries has no getAndset or update
					// TimeSeries Data has timestamp and updated content
					LOG.info("Updating redis cache for Timestamp = {}", timestamp);
					ts.add(timestamp, cacheValue, new Long(ttl), TimeUnit.SECONDS);
				} catch (RedisConnectionException e) {
					redisState = false;
				}
			}
			ts.touch();
		}
		ThirdeyeMetricsUtil.redisWriteCounter.inc();
	}

	public boolean isActive() {
		return redisState;
	}

	private synchronized RedissonClient getRedissonClient() {
		if (redissonClient == null) {
			redissonClient = Redisson.create(redissonConfig);
		}
		return redissonClient;
	}

	public String createKey(long metricId, String dimensionKey) {
		StringBuilder key = new StringBuilder(KEY_PREFIX);
		key.append(metricId).append(":").append("dimensionKey").append(":").append(dimensionKey);
		return key.toString();
	}
}
