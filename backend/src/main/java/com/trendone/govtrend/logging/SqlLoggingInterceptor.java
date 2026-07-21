package com.trendone.govtrend.logging;

import java.util.ArrayList;
import java.util.List;

import org.apache.ibatis.executor.Executor;
import org.apache.ibatis.mapping.BoundSql;
import org.apache.ibatis.mapping.MappedStatement;
import org.apache.ibatis.mapping.ParameterMapping;
import org.apache.ibatis.mapping.ParameterMode;
import org.apache.ibatis.plugin.Intercepts;
import org.apache.ibatis.plugin.Interceptor;
import org.apache.ibatis.plugin.Invocation;
import org.apache.ibatis.plugin.Signature;
import org.apache.ibatis.reflection.MetaObject;
import org.apache.ibatis.session.ResultHandler;
import org.apache.ibatis.session.RowBounds;
import org.apache.ibatis.type.TypeHandlerRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component
@Profile("dev")
@Intercepts({
        @Signature(type = Executor.class, method = "query", args = {
                MappedStatement.class, Object.class, RowBounds.class, ResultHandler.class
        }),
        @Signature(type = Executor.class, method = "update", args = {
                MappedStatement.class, Object.class
        })
})
public class SqlLoggingInterceptor implements Interceptor {

    private static final Logger LOGGER = LoggerFactory.getLogger(SqlLoggingInterceptor.class);
    private static final String REQUEST_ID_KEY = "requestId";
    private static final String SQL_COUNT_KEY = "sqlCount";
    private static final int MAX_PARAMETER_LENGTH = 500;

    @Override
    public Object intercept(Invocation invocation) throws Throwable {
        MappedStatement mappedStatement = (MappedStatement) invocation.getArgs()[0];
        Object parameter = invocation.getArgs().length > 1 ? invocation.getArgs()[1] : null;
        BoundSql boundSql = mappedStatement.getBoundSql(parameter);
        String statementId = mappedStatement.getId();
        String sql = normalizeSql(boundSql.getSql());
        String parameters = parameterSummary(mappedStatement, boundSql, parameter);
        String requestId = valueOrDash(MDC.get(REQUEST_ID_KEY));
        long startedAt = System.currentTimeMillis();
        incrementSqlCount();

        LOGGER.debug("[{}] SQL start statement={} sql={} parameters={}",
                requestId, statementId, sql, parameters);

        try {
            Object result = invocation.proceed();
            LOGGER.debug("[{}] SQL success statement={} durationMs={} result={}",
                    requestId, statementId, System.currentTimeMillis() - startedAt, resultSummary(result));
            return result;
        } catch (Throwable exception) {
            LOGGER.error("[{}] SQL failed statement={} durationMs={} sql={} parameters={}",
                    requestId, statementId, System.currentTimeMillis() - startedAt, sql, parameters, exception);
            throw exception;
        }
    }

    private String parameterSummary(
            MappedStatement mappedStatement,
            BoundSql boundSql,
            Object parameterObject) {
        TypeHandlerRegistry typeHandlerRegistry = mappedStatement.getConfiguration().getTypeHandlerRegistry();
        MetaObject metaObject = parameterObject == null
                ? null
                : mappedStatement.getConfiguration().newMetaObject(parameterObject);
        List<String> parameters = new ArrayList<>();

        for (ParameterMapping mapping : boundSql.getParameterMappings()) {
            if (mapping.getMode() == ParameterMode.OUT) {
                continue;
            }

            String property = mapping.getProperty();
            Object value;
            if (boundSql.hasAdditionalParameter(property)) {
                value = boundSql.getAdditionalParameter(property);
            } else if (parameterObject == null) {
                value = null;
            } else if (typeHandlerRegistry.hasTypeHandler(parameterObject.getClass())) {
                value = parameterObject;
            } else if (metaObject != null && metaObject.hasGetter(property)) {
                value = metaObject.getValue(property);
            } else {
                value = null;
            }
            parameters.add(property + "=" + safeValue(value));
        }
        return parameters.toString();
    }

    private void incrementSqlCount() {
        String currentCount = MDC.get(SQL_COUNT_KEY);
        int count;
        try {
            count = currentCount == null ? 0 : Integer.parseInt(currentCount);
        } catch (NumberFormatException ignored) {
            count = 0;
        }
        MDC.put(SQL_COUNT_KEY, Integer.toString(count + 1));
    }

    private String resultSummary(Object result) {
        if (result instanceof List) {
            return "rows=" + ((List<?>) result).size();
        }
        return String.valueOf(result);
    }

    private String normalizeSql(String sql) {
        return sql == null ? "" : sql.replaceAll("\\s+", " ").trim();
    }

    private String safeValue(Object value) {
        if (value == null) {
            return "null";
        }
        String text = String.valueOf(value);
        return text.length() <= MAX_PARAMETER_LENGTH
                ? text
                : text.substring(0, MAX_PARAMETER_LENGTH) + "...(truncated)";
    }

    private String valueOrDash(String value) {
        return value == null || value.isEmpty() ? "-" : value;
    }
}
