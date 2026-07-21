package com.trendone.govtrend.filter;

import java.io.IOException;
import java.util.UUID;

import javax.servlet.FilterChain;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class ApiRequestLoggingFilter extends OncePerRequestFilter {

    private static final Logger LOGGER = LoggerFactory.getLogger(ApiRequestLoggingFilter.class);
    private static final String MEMBER_UID_ATTRIBUTE = "mbrUid";
    private static final String REQUEST_ID_KEY = "requestId";
    private static final String SQL_COUNT_KEY = "sqlCount";

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return "OPTIONS".equalsIgnoreCase(request.getMethod())
                || !request.getRequestURI().startsWith("/api/");
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        long startedAt = System.currentTimeMillis();
        String requestId = UUID.randomUUID().toString().substring(0, 8);
        MDC.put(REQUEST_ID_KEY, requestId);
        MDC.put(SQL_COUNT_KEY, "0");

        try {
            filterChain.doFilter(request, response);
        } finally {
            LOGGER.info(
                    "[{}] API request method={} uri={} status={} durationMs={} sqlCount={} user={} contentType={}",
                    requestId,
                    request.getMethod(),
                    requestUri(request),
                    response.getStatus(),
                    System.currentTimeMillis() - startedAt,
                    MDC.get(SQL_COUNT_KEY),
                    sessionUser(request),
                    request.getContentType());
            MDC.remove(SQL_COUNT_KEY);
            MDC.remove(REQUEST_ID_KEY);
        }
    }

    private String requestUri(HttpServletRequest request) {
        String queryString = request.getQueryString();
        return queryString == null || queryString.isEmpty()
                ? request.getRequestURI()
                : request.getRequestURI() + "?" + queryString;
    }

    private String sessionUser(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session == null) {
            return "-";
        }
        Object memberUid = session.getAttribute(MEMBER_UID_ATTRIBUTE);
        return memberUid == null ? "-" : memberUid.toString();
    }
}
