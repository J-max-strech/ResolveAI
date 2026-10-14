
package br.edu.ifto.resolveai.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ChatController {

    @GetMapping("/api/chat")
    public String testarChat() {
        return "ResolveAI está funcionando!";
    }

}
