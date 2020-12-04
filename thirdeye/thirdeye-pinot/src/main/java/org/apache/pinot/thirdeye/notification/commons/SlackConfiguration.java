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

package org.apache.pinot.thirdeye.notification.commons;

import java.util.Map;

import com.google.common.base.MoreObjects;

import org.apache.commons.collections4.MapUtils;

public class SlackConfiguration {

	public static final String SLACK_CONF = "slackConfiguration";
	public static final String SLACK_URL = "webhookUrl";
	public static final String DEFAULT_CHANNEL = "defaultChannel";
	public static final String SLACK_TOKEN = "slackToken";

	private String url;
	private String defaultChannel;
	private String slackToken;

	public String getUrl() {
		return url;
	}

	public void setUrl(String url) {
		this.url = url;
	}

	public String getDefaultChannel() {
		return defaultChannel;
	}

	public void setDefaultChannel(String defaultChannel) {
		this.defaultChannel = defaultChannel;
	}

	public String getSlackToken() {
		return slackToken;
	}

	public void setSlackToken(String slackToken) {
		this.slackToken = slackToken;
	}

	@Override
	public String toString() {
		return MoreObjects.toStringHelper(this).add(SLACK_URL, url).toString();
	}

	public static SlackConfiguration createFromProperties(Map<String, Object> slackConfiguration) {
		SlackConfiguration conf = new SlackConfiguration();
		try {
			conf.setUrl(MapUtils.getString(slackConfiguration, SLACK_URL));
		} catch (Exception e) {
			throw new RuntimeException("Error occurred while parsing slack configuration into object.", e);
		}
		return conf;
	}
}
