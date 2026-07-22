package com.trendone.govtrend.filter;

import java.io.IOException;

import javax.servlet.FilterChain;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.trendone.govtrend.common.ErrorCode;
import com.trendone.govtrend.common.ResponseDto;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class SessionCheckFilter extends OncePerRequestFilter {

    private final ObjectMapper objectMapper;
    private final String sessionAttributeName;

    public SessionCheckFilter(
            ObjectMapper objectMapper,
            @Value("${app.session.attribute-name:sessionExists}") String sessionAttributeName) {
        this.objectMapper = objectMapper;
        this.sessionAttributeName = sessionAttributeName;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }

        String uri = request.getRequestURI();
        return !(uri.startsWith("/api/governors/")
                || "/api/crud".equals(uri)
                || "/api/crud/preview".equals(uri)
                || uri.startsWith("/api/transactions/"));
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        HttpSession session = request.getSession(false);
        boolean authenticated = session != null
                && Boolean.TRUE.equals(session.getAttribute(sessionAttributeName));

        if (!authenticated) {
            response.setStatus(HttpServletResponse.SC_OK);
            response.setContentType("application/json;charset=UTF-8");
            objectMapper.writeValue(response.getWriter(),
                    ResponseDto.ok(ErrorCode.EMPTY_SESSION.getCode(), ErrorCode.EMPTY_SESSION.getMessage()));
            return;
        }

        filterChain.doFilter(request, response);
    }
}
